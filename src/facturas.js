const fs = require('fs');

const path = './data/facturadas.json';

function obtenerFacturadas() {
  if (!fs.existsSync(path)) return [];
  return JSON.parse(fs.readFileSync(path));
}

function yaFacturada(id) {
  return obtenerFacturadas().includes(id);
}

function guardarFacturada(id) {
  const data = obtenerFacturadas();
  data.push(id);
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

module.exports = { yaFacturada, guardarFacturada };