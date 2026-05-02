const { parseMoney } = require('../utils');
const { calculateDashboardMetrics } = require('./metrics');
const {
  buildItemCostIndex,
  findItemCost,
  getInvoices,
  getItems
} = require('./alegraService');

function invoiceDate(invoice) {
  return invoice.date || invoice.datetime || invoice.createdAt || invoice.created_at;
}

function invoiceClient(invoice) {
  if (invoice.client?.name) return invoice.client.name;
  if (invoice.client?.nameObject) {
    const firstName = invoice.client.nameObject.firstName || '';
    const lastName = invoice.client.nameObject.lastName || '';
    return `${firstName} ${lastName}`.trim();
  }
  if (invoice.client?.id) return `Cliente ${invoice.client.id}`;
  return 'Cliente sin nombre';
}

function itemQuantity(item) {
  return Number(item.quantity || item.qty || 0) || 0;
}

function itemUnitOrTotal(item) {
  return parseMoney(item.total || item.subtotal || item.price || item.unitPrice);
}

function normalizeAlegraInvoices(invoices, itemsCatalog = []) {
  const costIndex = buildItemCostIndex(itemsCatalog);

  return invoices.map(invoice => {
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const normalizedItems = items.map(item => {
      const quantity = itemQuantity(item);
      const unitOrTotal = itemUnitOrTotal(item);
      const sales = item.total || item.subtotal ? unitOrTotal : unitOrTotal * quantity;
      const catalogItem = findItemCost(costIndex, item);
      const cost = catalogItem.cost * quantity;

      return {
        id: String(item.id || item.item?.id || ''),
        name: item.name || item.description || item.item?.name || catalogItem.name || 'Producto sin nombre',
        reference: item.reference || item.item?.reference || catalogItem.reference || '',
        quantity,
        sales,
        total: sales,
        cost
      };
    });

    const calculatedSales = normalizedItems.reduce((sum, item) => sum + item.sales, 0);
    const sales = parseMoney(invoice.total || invoice.totalPaid || invoice.balance) || calculatedSales;
    const cost = normalizedItems.reduce((sum, item) => sum + item.cost, 0);
    const units = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    const dateRaw = invoiceDate(invoice);

    return {
      id: String(invoice.number || invoice.id || invoice.uuid || ''),
      source: 'alegra',
      customer: invoiceClient(invoice),
      status: invoice.status || invoice.invoiceStatus || 'sin estado',
      date: new Date(dateRaw),
      dateLabel: dateRaw,
      sales,
      total: sales,
      cost,
      units,
      items: normalizedItems
    };
  }).filter(order => order.id && !Number.isNaN(order.date.getTime()));
}

async function metricsFromAlegra(options = {}) {
  const [invoiceResult, itemResult] = await Promise.all([
    getInvoices(options),
    getItems({ limit: Number(options.itemLimit) || 100 })
  ]);

  const orders = normalizeAlegraInvoices(invoiceResult.data, itemResult.data);
  return calculateDashboardMetrics(orders, {
    ...options,
    source: 'alegra',
    connection: {
      status: 'connected',
      invoicesCache: invoiceResult.cache,
      itemsCache: itemResult.cache
    }
  });
}

module.exports = {
  metricsFromAlegra,
  normalizeAlegraInvoices
};
