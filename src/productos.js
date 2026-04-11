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
  } catch {
    return null;
  }
}

async function crearProducto(item) {

  const referencia = limpiarSKU(item.sku);

  const existente = await buscarProductoPorReferencia(referencia);

  if (existente) {
    console.log(`📦 ${referencia} → ✅`);
    return existente.id;
  }

  try {
    const res = await alegra.post('/items', {
      name: item.producto,
      reference: referencia,
      price: item.precio,

      unit: "Unidad", // 🔥 SOLUCIÓN CLAVE

      tax: [{ id: 4 }]
    });

    console.log(`📦 ${referencia} → 🆕`);

    return res.data.id;

  } catch (error) {
    console.log(`❌ Producto ${referencia}`, error.response?.data);
    return null;
  }
}

module.exports = { crearProducto };