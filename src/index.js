require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');

const alegra = require('./alegra');
const { crearProducto } = require('./productos');
const { yaFacturada, guardarFacturada } = require('./facturas');

console.log('🔥 INICIANDO FACTURACIÓN...\n');

let ordenes = {};

// validar CSV
if (!fs.existsSync('./input/rappi.csv')) {
  console.log('❌ No existe rappi.csv en /input');
  process.exit();
}

// leer CSV
fs.createReadStream('./input/rappi.csv')
  .pipe(csv())
  .on('data', (row) => {

    const orderId = row['ID de la orden'];

    if (!ordenes[orderId]) {
      ordenes[orderId] = {
        cliente: {
          documento: row['Documento'] || '222222222221'
        },
        items: []
      };
    }

    ordenes[orderId].items.push({
      producto: row['Producto'],
      cantidad: Number(row['Unidades']) || 1,
      precio: Number(row['Precio unitario']) || 0,
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
      const clienteId = 5;

      const itemsAlegra = [];

      // 🔥 productos
      for (const item of orden.items) {

        const productoId = await crearProducto(item);

        if (productoId) {
          itemsAlegra.push({
            id: productoId,
            price: item.precio,
            quantity: item.cantidad,

            // 🔥 asegurar IVA en factura
            tax: [
              {
                id: 1
              }
            ]
          });
        }
      }

      if (itemsAlegra.length === 0) {
        console.log(`❌ Orden ${orderId} sin productos válidos`);
        continue;
      }

      try {

        const hoy = new Date();
        const fecha = hoy.toISOString().split('T')[0];

        const vencimiento = new Date(hoy);
        vencimiento.setDate(hoy.getDate() + 30);

        const factura = {
          date: fecha,
          dueDate: vencimiento.toISOString().split('T')[0],

          client: { id: clienteId },

          numberTemplate: {
            number: orderId
          },

          items: itemsAlegra,

          // 🔥 TEXTO LEGAL
          observations: `Pedido Rappi ${orderId}

Factura correspondiente a ventas realizadas a través de la plataforma Rappi. El recaudo es efectuado por el intermediario conforme a sus condiciones comerciales.`,

          paymentForm: 'CASH',

          status: 'open'
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