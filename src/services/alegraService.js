const alegra = require('../alegra');
const { parseMoney } = require('../utils');

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(name, params) {
  return `${name}:${JSON.stringify(params || {})}`;
}

function getCached(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function setCached(key, value) {
  cache.set(key, {
    createdAt: Date.now(),
    value
  });
}

function ensureCredentials() {
  if (!process.env.ALEGRA_EMAIL || !process.env.ALEGRA_API_KEY) {
    throw new Error('Faltan ALEGRA_EMAIL o ALEGRA_API_KEY en .env');
  }
}

async function fetchPaged(endpoint, params, maxPages = 3) {
  const limit = Math.min(Number(params.limit) || 30, 30);
  const all = [];

  for (let page = 0; page < maxPages; page += 1) {
    const response = await alegra.get(endpoint, {
      params: {
        ...params,
        limit,
        start: page * limit
      }
    });

    const data = Array.isArray(response.data) ? response.data : [];
    all.push(...data);

    if (data.length < limit) break;
  }

  return all;
}

async function getInvoices({ from, to, limit = 30, maxPages = 3 } = {}) {
  ensureCredentials();

  const params = { limit: Math.min(Number(limit) || 30, 30) };
  if (from) params.dateStart = from;
  if (to) params.dateEnd = to;

  const key = cacheKey('invoices', params);
  const cached = getCached(key);
  if (cached) return { data: cached, cache: true };

  const data = await fetchPaged('/invoices', params, maxPages);
  setCached(key, data);

  return { data, cache: false };
}

async function getItems({ limit = 30, maxPages = 3 } = {}) {
  ensureCredentials();

  const params = { limit: Math.min(Number(limit) || 30, 30) };
  const key = cacheKey('items', params);
  const cached = getCached(key);
  if (cached) return { data: cached, cache: true };

  const data = await fetchPaged('/items', params, maxPages);
  setCached(key, data);

  return { data, cache: false };
}

function itemCost(item) {
  return parseMoney(
    item.cost ||
    item.costCenter ||
    item.inventory?.unitCost ||
    item.inventory?.cost ||
    item.purchasePrice ||
    0
  );
}

function buildItemCostIndex(items) {
  const byId = new Map();
  const byReference = new Map();
  const byName = new Map();

  items.forEach(item => {
    const cost = itemCost(item);
    const data = {
      id: String(item.id || ''),
      name: item.name || '',
      reference: String(item.reference || ''),
      cost
    };

    if (data.id) byId.set(data.id, data);
    if (data.reference) byReference.set(data.reference, data);
    if (data.name) byName.set(data.name.toLowerCase(), data);
  });

  return { byId, byReference, byName };
}

function findItemCost(index, invoiceItem) {
  const id = String(invoiceItem.id || invoiceItem.item?.id || '');
  const reference = String(invoiceItem.reference || invoiceItem.item?.reference || '');
  const name = String(invoiceItem.name || invoiceItem.description || invoiceItem.item?.name || '').toLowerCase();

  return (
    index.byId.get(id) ||
    index.byReference.get(reference) ||
    index.byName.get(name) ||
    { cost: 0 }
  );
}

module.exports = {
  buildItemCostIndex,
  findItemCost,
  getInvoices,
  getItems
};
