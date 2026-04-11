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
    const response = await alegra.post('/items', {
      name: item.producto,
      reference: referencia,
      price: item.precio,
      description: item.producto,

      // 🔥 NUEVO (CLAVE DIAN)
      unit: "unit", // 👈 unidad estándar

      tax: [
        {
          id: 1
        }
      ],

      priceIncludesTax: true
    });

    console.log(`📦 ${referencia} → 🆕`);

    return response.data.id;

  } catch (error) {
    console.log(`❌ Producto ${referencia}:`, error.response?.data || error.message);
    return null;
  }
}

module.exports = { crearProducto };