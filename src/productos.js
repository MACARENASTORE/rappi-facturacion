const alegra = require('./alegra');

function limpiarSKU(sku) {
  if (!sku) return '';
  return sku.replace('macarenastore_', '').trim();
}

async function buscarProductoPorReferencia(ref) {
  try {
    const res = await alegra.get('/items', {
      params: { query: ref }
    });

    return res.data.find(p => String(p.reference) === String(ref));
  } catch (error) {
    console.log(`Error buscando producto ${ref}`, error.response?.data || error.message);
    return null;
  }
}

async function actualizarProducto(producto) {
  try {
    await alegra.put(`/items/${producto.id}`, {
      tax: [{ id: 4 }]
    });

    console.log(`Producto corregido -> ${producto.reference}`);
  } catch (error) {
    console.log(`Error corrigiendo producto ${producto.reference}`, error.response?.data || error.message);
  }
}

async function crearProducto(item) {
  const referencia = limpiarSKU(item.sku);

  if (!referencia) {
    console.log(`Producto sin SKU omitido: ${item.producto || 'sin nombre'}`);
    return null;
  }

  let producto = await buscarProductoPorReferencia(referencia);

  if (producto) {
    const necesitaFix = !producto.tax || producto.tax.length === 0;

    if (necesitaFix) {
      await actualizarProducto(producto);
      producto = await buscarProductoPorReferencia(referencia);
    }

    console.log(`Producto ${referencia} -> existe`);
    return producto.id;
  }

  try {
    const res = await alegra.post('/items', {
      name: item.producto,
      reference: referencia,
      price: item.precio,
      tax: [{ id: 4 }]
    });

    console.log(`Producto ${referencia} -> creado`);
    return res.data.id;
  } catch (error) {
    console.log(`Producto ${referencia} no se pudo crear`, error.response?.data || error.message);
    return null;
  }
}

module.exports = { crearProducto };
