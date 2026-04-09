const fs = require('fs');
const csv = require('csv-parser');

const { crearCliente } = require('./clientes');
const { crearFactura } = require('./facturas');
const { yaFacturada, guardarFacturada } = require('./historial');

// 🔥 MODO PRUEBA (NO CREA FACTURAS)
const MODO_PRUEBA = true;

let ordenes = {};

fs.createReadStream('./input/rappi.csv')
  .pipe(csv())
  .on('data', (row) => {

    const orderId = row['ID de la orden'];

    if (!ordenes[orderId]) {
      ordenes[orderId] = {
        cliente: {
          nombre: row['Usuario'],
          email: row['Email'],
          telefono: row['Teléfono'],
          documento: row['Documento'] || '222222222221'
        },
        items: [],
        total: Number(row['Pago total al aliado'])
      };
    }

    ordenes[orderId].items.push({
      producto: row['Producto'],
      cantidad: Number(row['Unidades']),
      precio: Number(row['Precio unitario']),
      sku: row['SKU']
    });

  })
  .on('end', async () => {

    console.log("🔥 INICIANDO FACTURACIÓN...\n");

    for (const id in ordenes) {

      if (yaFacturada(id)) {
        console.log("⏭️ Ya facturada:", id);
        continue;
      }

      const orden = ordenes[id];

      console.log("🧾 Procesando orden:", id);

      const clienteId = await crearCliente(orden.cliente);

      if (!clienteId) {
        console.log("❌ Cliente no válido");
        continue;
      }

      let facturaCreada = false;

      // 🧪 MODO PRUEBA
      if (MODO_PRUEBA) {
        console.log("🧪 MODO PRUEBA → No se crea factura:", id);
        facturaCreada = true;
      } else {
        facturaCreada = await crearFactura(clienteId, orden.items, id);
      }

      if (facturaCreada) {
        guardarFacturada(id);
      }
    }

    console.log("\n✅ PROCESO COMPLETO");
  });