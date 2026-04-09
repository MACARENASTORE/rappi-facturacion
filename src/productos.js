const alegra = require('./alegra');

async function buscarProducto(referencia) {
  try {
    const response = await alegra.get('/items', {
      params: { reference: referencia }
    });

    if (response.data.length > 0) {
      return response.data[0].id;
    }

    return null;

  } catch (error) {
    console.log("❌ Error buscando producto:", referencia);
    return null;
  }
}

async function construirItems(items) {
  let resultado = [];

  for (const i of items) {

    const productoId = await buscarProducto(i.sku);

    if (!productoId) {
      console.log("⚠️ Producto no encontrado:", i.sku);
      continue;
    }

    resultado.push({
      id: productoId,
      price: i.precio,
      quantity: i.cantidad
    });
  }

  return resultado;
}

module.exports = { construirItems };