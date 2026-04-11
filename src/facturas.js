const fs = require('fs');

const path = './data/facturadas.json';

// Obtener lista
function obtenerFacturadas() {
  if (!fs.existsSync(path)) {
    return [];
  }

  const data = fs.readFileSync(path);
  return JSON.parse(data);
}

// Verificar si ya fue facturada
function yaFacturada(orderId) {
  const facturadas = obtenerFacturadas();
  return facturadas.includes(orderId);
}

// Guardar orden facturada
function guardarFacturada(orderId) {
  const facturadas = obtenerFacturadas();

  facturadas.push(orderId);

  fs.writeFileSync(path, JSON.stringify(facturadas, null, 2));
}

module.exports = {
  yaFacturada,
  guardarFacturada
};