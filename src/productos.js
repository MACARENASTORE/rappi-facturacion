const alegra = require('./alegra');

// 🔥 LIMPIAR SKU RAPPI
function limpiarSKU(sku) {
  if (!sku) return '';
  return sku.replace('macarenastore_', '').trim();
}

// 🔍 BUSCAR PRODUCTO POR REFERENCIA
async function buscarProductoPorReferencia(ref) {
  try {
    const res = await alegra.get('/items', {
      params: { query: ref }
    });

    return res.data.find(p => String(p.reference) === String(ref));
  } catch (error) {
    return null;
  }
}

// 🔧 CORREGIR PRODUCTO (unidad + IVA)
async function actualizarProducto(producto) {
  try {
    await alegra.put(`/items/${producto.id}`, {
      unit: { id: 1 }, // 🔥 Unidad válida
      tax: [{ id: 4 }] // 🔥 IVA 19%
    });

    console.log(`🔧 Producto corregido → ${producto.reference}`);

  } catch (error) {
    console.log(`❌ Error corrigiendo producto ${producto.reference}`, error.response?.data);
  }
}

// 🔥 CREAR O VALIDAR PRODUCTO
async function crearProducto(item) {

  const referencia = limpiarSKU(item.sku);

  let producto = await buscarProductoPorReferencia(referencia);

  // ✅ SI EXISTE
  if (producto) {

    const necesitaFix =
      !producto.unit ||
      !producto.tax ||
      producto.tax.length === 0;

    if (necesitaFix) {
      await actualizarProducto(producto);

      // volver a consultar
      producto = await buscarProductoPorReferencia(referencia);
    }

    console.log(`📦 ${referencia} → ✅`);
    return producto.id;
  }

  // 🆕 SI NO EXISTE → CREAR
  try {
    const res = await alegra.post('/items', {
      name: item.producto,
      reference: referencia,
      price: item.precio,

      unit: { id: 1 }, // 🔥 CLAVE SOLUCION
      tax: [{ id: 4 }] // 🔥 IVA
    });

    console.log(`📦 ${referencia} → 🆕`);

    return res.data.id;

  } catch (error) {
    console.log(`❌ Producto ${referencia}`, error.response?.data);
    return null;
  }
}

module.exports = { crearProducto };