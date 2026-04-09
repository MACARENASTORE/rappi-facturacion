const alegra = require('./alegra');
const { construirItems } = require('./productos');

async function crearFactura(clienteId, items, orderId) {
  try {
    const itemsFormateados = await construirItems(items);

    if (itemsFormateados.length === 0) {
      console.log("❌ Orden sin productos válidos:", orderId);
      return false;
    }

    const response = await alegra.post('/invoices', {
      client: clienteId,
      items: itemsFormateados
    });

    console.log("🔥 FACTURA CREADA:", orderId, "->", response.data.id);

    return true;

  } catch (error) {
    console.log("❌ Error creando factura:", orderId);
    return false;
  }
}

module.exports = { crearFactura };