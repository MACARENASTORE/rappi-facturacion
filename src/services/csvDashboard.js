const fs = require('fs');
const csv = require('csv-parser');
const { parseMoney } = require('../utils');
const { calculateDashboardMetrics } = require('./metrics');

function value(row, names) {
  for (const name of names) {
    if (row[name] !== undefined) return row[name];
  }
  return '';
}

function readCsvRows(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

function normalizeRappiRows(rows) {
  const orders = new Map();

  rows.forEach(row => {
    const orderId = value(row, ['ID de la orden']);
    const createdAtRaw = value(row, [
      'Fecha de creación',
      'Fecha de creaciÃ³n',
      'Fecha de creaciÃƒÂ³n'
    ]);
    const createdAt = new Date(createdAtRaw);

    if (!orderId || Number.isNaN(createdAt.getTime())) return;

    const status = value(row, ['Estado']) || 'sin estado';
    const quantity = Number(value(row, ['Unidades'])) || 0;
    const lineTotal = parseMoney(value(row, ['Precio con descuento']));
    const orderTotal = parseMoney(value(row, ['Pago total al aliado']));

    if (!orders.has(orderId)) {
      orders.set(orderId, {
        id: orderId,
        source: 'csv',
        customer: value(row, ['Usuario']) || 'Cliente sin nombre',
        customerDocument: value(row, ['Documento']) || '',
        status,
        date: createdAt,
        dateLabel: createdAtRaw,
        total: orderTotal || lineTotal,
        units: 0,
        items: []
      });
    }

    const order = orders.get(orderId);
    order.units += quantity;
    order.items.push({
      name: value(row, ['Producto']) || 'Producto sin nombre',
      quantity,
      sales: lineTotal,
      total: lineTotal,
      cost: 0
    });
  });

  return Array.from(orders.values());
}

async function metricsFromCsv(filePath, options = {}) {
  const rows = await readCsvRows(filePath);
  const orders = normalizeRappiRows(rows);
  return calculateDashboardMetrics(orders, {
    ...options,
    source: 'csv'
  });
}

module.exports = {
  metricsFromCsv,
  normalizeRappiRows,
  readCsvRows
};
