require('dotenv').config();

const fs = require('fs');
const csv = require('csv-parser');

const alegra = require('./alegra');
const { crearProducto } = require('./productos');
const { crearCliente } = require('./clientes');
const { yaFacturada, guardarFacturada } = require('./facturas');

console.log('🔥 INICIANDO FACTURACIÓN...\n');

let ordenes = {};

fs.createReadStream('./input/rappi.csv')
  .pipe(csv())
  .on('data', (row) => {

    // 🔥 solo pedidos finalizados
    if (row['Estado'] !== 'finished') return;

    const orderId = row['ID de la orden'];

    if (!ordenes[orderId]) {
      ordenes[orderId] = {
        cliente: {
          documento: row['Documento'] || '222222222221',
          nombre: row['Usuario']
        },
        items: [],
        totalRappi: Number(row['Pago total al aliado']) || 0
      };
    }

    const cantidad = Number(row['Unidades']) || 1;
    const totalLinea = Number(row['Precio con descuento']) || 0;
    const precioUnitario = totalLinea / cantidad;

    ordenes[orderId].items.push({
      producto: row['Producto'],
      cantidad,
      precio: precioUnitario,
      sku: row['SKU']
    });

  })

  .on('end', async () => {

    for (const orderId in ordenes) {

      if (yaFacturada(orderId)) {
        console.log(`🧾 ${orderId} → ⏭️`);
        continue;
      }

      console.log(`🧾 Procesando orden: ${orderId}`);

      const orden = ordenes[orderId];

      // 👤 cliente
      const clienteId = await crearCliente(orden.cliente);

      const itemsAlegra = [];

      for (const item of orden.items) {

        const productoId = await crearProducto(item);

        if (!productoId) {
          console.log(`❌ Producto inválido, se omite`);
          continue;
        }

        // 💰 precio sin IVA
        const precioSinIVA = item.precio / 1.19;

        itemsAlegra.push({
          id: productoId,
          price: Number(precioSinIVA.toFixed(2)),
          quantity: item.cantidad,
          tax: [{ id: 4 }]
        });

        console.log(`📦 ${item.sku} → ✅`);
      }

      if (itemsAlegra.length === 0) continue;

      // 🔥 ajuste para cuadrar total exacto
      const totalCalculado = itemsAlegra.reduce((acc, item) => {
        return acc + (item.price * item.quantity * 1.19);
      }, 0);

      const diferencia = orden.totalRappi - totalCalculado;

      if (Math.abs(diferencia) > 0.01) {
        const ultimo = itemsAlegra[itemsAlegra.length - 1];
        const ajuste = diferencia / 1.19;
        ultimo.price += ajuste;

        console.log(`🧮 Ajuste aplicado: ${diferencia.toFixed(2)}`);
      }

      try {

        const hoy = new Date();
        const fecha = hoy.toISOString().split('T')[0];

        // 📅 vencimiento a 15 días
        const vencimiento = new Date();
        vencimiento.setDate(hoy.getDate() + 15);
        const dueDate = vencimiento.toISOString().split('T')[0];

        const factura = {
          date: fecha,
          dueDate: dueDate,

          client: { id: clienteId },

          numberTemplate: {
            number: orderId
          },

          // 🔥 SOLUCIÓN FINAL (strings para tu cuenta)
          paymentForm: "CREDIT",
          paymentMethod: "CASH",

          status: 'draft',

          items: itemsAlegra,

          termsConditions:
            `Este documento se asimila en todos sus efectos a una letra de cambio de conformidad con el Art. 774 del código de comercio. Autorizo que en caso de incumplimiento de esta obligación sea reportado a las centrales de riesgo, se cobraran intereses por mora.
            Factura correspondiente a la orden Rappi No. ${orderId}. El recaudo es efectuado por el intermediario conforme a sus condiciones comerciales.`
        };

        await alegra.post('/invoices', factura);

        console.log(`🧾 ${orderId} → ✅ FACTURA CREADA`);

        guardarFacturada(orderId);

      } catch (error) {
        console.log(`❌ Error factura ${orderId}`, error.response?.data || error.message);
      }

    }

    console.log('\n✅ PROCESO COMPLETO');

  });