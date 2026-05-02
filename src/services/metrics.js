function parseDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeRange({ from, to } = {}) {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return { fromDate, toDate };
}

function inRange(date, range) {
  if (!date) return false;
  if (range.fromDate && date < range.fromDate) return false;
  if (range.toDate && date > range.toDate) return false;
  return true;
}

function normalizedText(value) {
  return String(value || '').toLowerCase().trim();
}

function contains(value, query) {
  if (!query) return true;
  return normalizedText(value).includes(normalizedText(query));
}

function orderMatchesFilters(order, filters) {
  if (filters.status && order.status !== filters.status) return false;
  if (filters.customer && !contains(order.customer, filters.customer)) return false;

  if (filters.product) {
    const hasProduct = order.items.some(item => contains(item.name, filters.product));
    if (!hasProduct) return false;
  }

  if (filters.q) {
    const haystack = [
      order.id,
      order.customer,
      order.status,
      ...order.items.map(item => item.name)
    ].join(' ');

    if (!contains(haystack, filters.q)) return false;
  }

  return true;
}

function marginPercent(profit, sales) {
  return sales > 0 ? (profit / sales) * 100 : 0;
}

function addMetric(map, key, values = {}) {
  const name = key || 'Sin nombre';
  if (!map.has(name)) {
    map.set(name, {
      name,
      sales: 0,
      total: 0,
      cost: 0,
      profit: 0,
      units: 0,
      orders: new Set()
    });
  }

  const item = map.get(name);
  item.sales += values.sales || 0;
  item.total = item.sales;
  item.cost += values.cost || 0;
  item.profit += values.profit || 0;
  item.units += values.units || 0;
  if (values.orderId) item.orders.add(values.orderId);
}

function serializeMetric(metric) {
  return {
    name: metric.name,
    sales: metric.sales,
    total: metric.sales,
    cost: metric.cost,
    profit: metric.profit,
    margin: marginPercent(metric.profit, metric.sales),
    units: metric.units,
    orders: metric.orders.size
  };
}

function sortedMetrics(map, key, limit) {
  return Array.from(map.values())
    .map(serializeMetric)
    .sort((a, b) => b[key] - a[key])
    .slice(0, limit);
}

function normalizeOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const normalizedItems = items.map(item => {
    const sales = Number(item.sales ?? item.total ?? 0) || 0;
    const quantity = Number(item.quantity ?? item.units ?? 0) || 0;
    const cost = Number(item.cost ?? 0) || 0;
    const profit = sales - cost;

    return {
      id: String(item.id || item.reference || item.name || ''),
      name: item.name || 'Producto sin nombre',
      reference: item.reference || '',
      quantity,
      units: quantity,
      sales,
      total: sales,
      cost,
      profit,
      margin: marginPercent(profit, sales)
    };
  });

  const sales = Number(order.sales ?? order.total ?? normalizedItems.reduce((sum, item) => sum + item.sales, 0)) || 0;
  const cost = Number(order.cost ?? normalizedItems.reduce((sum, item) => sum + item.cost, 0)) || 0;
  const profit = sales - cost;

  return {
    ...order,
    id: String(order.id || ''),
    customer: order.customer || 'Cliente sin nombre',
    status: order.status || 'sin estado',
    date: parseDate(order.date),
    sales,
    total: sales,
    cost,
    profit,
    margin: marginPercent(profit, sales),
    units: Number(order.units ?? normalizedItems.reduce((sum, item) => sum + item.quantity, 0)) || 0,
    items: normalizedItems
  };
}

function calculateDashboardMetrics(orders, options = {}) {
  const range = normalizeRange(options);
  const filters = {
    status: options.status || '',
    product: options.product || '',
    customer: options.customer || '',
    q: options.q || ''
  };

  const filtered = orders
    .map(normalizeOrder)
    .filter(order => order.id && order.date)
    .filter(order => inRange(order.date, range))
    .filter(order => orderMatchesFilters(order, filters))
    .sort((a, b) => b.date - a.date);

  if (filtered.length === 0) {
    return {
      empty: true,
      source: options.source || 'datos',
      connection: options.connection || null,
      message: 'No encontre datos para los filtros seleccionados.'
    };
  }

  const products = new Map();
  const statusCounts = new Map();
  const salesByDay = new Map();
  const profitByDay = new Map();
  const salesByHour = new Map();
  const costByDay = new Map();

  filtered.forEach(order => {
    statusCounts.set(order.status, (statusCounts.get(order.status) || 0) + 1);

    const day = dateKey(order.date);
    const hour = String(order.date.getHours()).padStart(2, '0') + ':00';

    salesByDay.set(day, (salesByDay.get(day) || 0) + order.sales);
    profitByDay.set(day, (profitByDay.get(day) || 0) + order.profit);
    costByDay.set(day, (costByDay.get(day) || 0) + order.cost);
    salesByHour.set(hour, (salesByHour.get(hour) || 0) + order.sales);

    order.items.forEach(item => {
      addMetric(products, item.name, {
        sales: item.sales,
        cost: item.cost,
        profit: item.profit,
        units: item.quantity,
        orderId: order.id
      });
    });
  });

  const totalSales = filtered.reduce((sum, order) => sum + order.sales, 0);
  const totalCost = filtered.reduce((sum, order) => sum + order.cost, 0);
  const totalProfit = totalSales - totalCost;
  const totalUnits = filtered.reduce((sum, order) => sum + order.units, 0);
  const totalItems = filtered.reduce((sum, order) => sum + order.items.length, 0);
  const avgTicket = filtered.length ? totalSales / filtered.length : 0;
  const profitPerOrder = filtered.length ? totalProfit / filtered.length : 0;

  const salesDates = Array.from(new Set([...salesByDay.keys(), ...profitByDay.keys()]))
    .sort((a, b) => a.localeCompare(b));

  return {
    empty: false,
    source: options.source || 'datos',
    connection: options.connection || null,
    fecha: dateKey(filtered[0].date),
    rango: {
      desde: range.fromDate ? dateKey(range.fromDate) : null,
      hasta: range.toDate ? dateKey(range.toDate) : null
    },
    filtros: filters,
    resumen: {
      ventas: totalSales,
      costo: totalCost,
      utilidad: totalProfit,
      margen: marginPercent(totalProfit, totalSales),
      ordenes: filtered.length,
      ticketPromedio: avgTicket,
      utilidadPorPedido: profitPerOrder,
      unidades: totalUnits,
      productos: totalItems
    },
    series: {
      ventasDiarias: salesDates.map(date => ({
        date,
        total: salesByDay.get(date) || 0,
        profit: profitByDay.get(date) || 0,
        cost: costByDay.get(date) || 0
      })),
      utilidadDiaria: salesDates.map(date => ({
        date,
        profit: profitByDay.get(date) || 0
      })),
      ventasPorHora: Array.from(salesByHour.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, total]) => ({ hour, total })),
      ingresosVsCostos: [
        { name: 'Ingresos', value: totalSales },
        { name: 'Costos', value: totalCost },
        { name: 'Utilidad', value: totalProfit }
      ]
    },
    estados: Array.from(statusCounts.entries()).map(([name, count]) => ({ name, count })),
    topProductos: sortedMetrics(products, 'sales', 10),
    topProductosGanancia: sortedMetrics(products, 'profit', 10),
    topProductosMargen: sortedMetrics(products, 'margin', 10),
    productos: sortedMetrics(products, 'profit', 100),
    ordenes: filtered.map(order => ({
      id: order.id,
      customer: order.customer,
      status: order.status,
      date: order.dateLabel || order.date.toISOString(),
      sales: order.sales,
      total: order.sales,
      cost: order.cost,
      profit: order.profit,
      margin: order.margin,
      units: order.units,
      items: order.items
    })),
    ultimasOrdenes: filtered.slice(0, 10).map(order => ({
      id: order.id,
      customer: order.customer,
      status: order.status,
      date: order.dateLabel || order.date.toISOString(),
      sales: order.sales,
      total: order.sales,
      cost: order.cost,
      profit: order.profit,
      margin: order.margin,
      units: order.units,
      items: order.items.length
    }))
  };
}

module.exports = {
  calculateDashboardMetrics,
  dateKey,
  marginPercent,
  parseDate
};
