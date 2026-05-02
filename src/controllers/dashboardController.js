const fs = require('fs');
const path = require('path');
const { metricsFromCsv } = require('../services/csvDashboard');
const { metricsFromAlegra } = require('../services/alegraDashboard');

function dashboardOptions(req) {
  return {
    from: req.query.from || undefined,
    to: req.query.to || undefined,
    status: req.query.status || undefined,
    product: req.query.product || undefined,
    customer: req.query.customer || undefined,
    q: req.query.q || undefined,
    limit: Number(req.query.limit) || 100,
    itemLimit: Number(req.query.itemLimit) || 100
  };
}

function createDashboardController({ csvPath }) {
  async function csvMetricsResponse(filePath, req, res) {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        empty: true,
        source: 'csv',
        message: 'Sube un archivo CSV para ver metricas.'
      });
    }

    try {
      const metrics = await metricsFromCsv(filePath, dashboardOptions(req));
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        empty: true,
        source: 'csv',
        message: `No se pudo procesar el CSV: ${error.message}`
      });
    }
  }

  return {
    async getAlegraInvoices(req, res) {
      try {
        const metrics = await metricsFromAlegra(dashboardOptions(req));
        res.json(metrics);
      } catch (error) {
        res.status(502).json({
          empty: true,
          source: 'alegra',
          connection: { status: 'error' },
          message: `No se pudo cargar Alegra: ${error.response?.data?.message || error.message}`
        });
      }
    },

    async uploadCsv(req, res) {
      if (!req.file) {
        return res.status(400).json({
          empty: true,
          source: 'csv',
          message: 'No se recibio ningun archivo CSV.'
        });
      }

      fs.mkdirSync(path.dirname(csvPath), { recursive: true });

      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }

      fs.renameSync(req.file.path, csvPath);
      return csvMetricsResponse(csvPath, req, res);
    },

    getCsvDashboard(req, res) {
      return csvMetricsResponse(csvPath, req, res);
    },

    legacyUpload(req, res) {
      if (!req.file) return res.redirect('/?upload=error');

      fs.mkdirSync(path.dirname(csvPath), { recursive: true });

      if (fs.existsSync(csvPath)) {
        fs.unlinkSync(csvPath);
      }

      fs.renameSync(req.file.path, csvPath);
      res.redirect('/?upload=ok');
    }
  };
}

module.exports = { createDashboardController };
