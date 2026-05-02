require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const { createDashboardController } = require('./controllers/dashboardController');

const app = express();
const upload = multer({ dest: 'uploads/' });
const defaultCsvPath = path.join(__dirname, '../input/rappi.csv');
const dashboardController = createDashboardController({ csvPath: defaultCsvPath });
let procesando = false;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/alegra/invoices', dashboardController.getAlegraInvoices);
app.post('/api/upload-csv', upload.single('file'), dashboardController.uploadCsv);
app.get('/api/csv/dashboard', dashboardController.getCsvDashboard);

app.get('/dashboard', dashboardController.getCsvDashboard);
app.post('/upload', upload.single('file'), dashboardController.legacyUpload);

app.post('/procesar', (req, res) => {
  const token = process.env.PANEL_TOKEN;

  if (!token) {
    return res.status(500).json({
      resultado: 'Configura PANEL_TOKEN en .env antes de procesar facturas.'
    });
  }

  if (req.get('x-panel-token') !== token) {
    return res.status(401).json({ resultado: 'Token invalido.' });
  }

  if (procesando) {
    return res.status(409).json({ resultado: 'Ya hay un proceso de facturacion en curso.' });
  }

  procesando = true;

  exec('node src/index.js', (error, stdout, stderr) => {
    procesando = false;

    if (error) return res.status(500).json({ resultado: stderr || stdout || error.message });
    res.json({ resultado: stdout });
  });
});

app.listen(3000, () => {
  console.log('Panel en http://localhost:3000');
});
