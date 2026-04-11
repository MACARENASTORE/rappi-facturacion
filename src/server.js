const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

// 🏠 HOME
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 📤 SUBIR CSV
app.post('/upload', upload.single('file'), (req, res) => {
  const rutaDestino = path.join(__dirname, '../input/rappi.csv');

  if (fs.existsSync(rutaDestino)) {
    fs.unlinkSync(rutaDestino);
  }

  fs.renameSync(req.file.path, rutaDestino);
  res.redirect('/?upload=ok');
});

// ▶️ PROCESAR
app.get('/procesar', (req, res) => {
  exec('node src/index.js', (error, stdout, stderr) => {
    if (error) return res.json({ resultado: stderr });
    res.json({ resultado: stdout });
  });
});

// 📊 DASHBOARD REAL CORRECTO
app.get('/dashboard', (req, res) => {

  let fechas = [];
  let data = [];

  fs.createReadStream('./input/rappi.csv')
    .pipe(csv())
    .on('data', (row) => {

      const fecha = new Date(row['Fecha de creación']);

      if (!isNaN(fecha)) {
        fechas.push(fecha);
        data.push(row);
      }

    })
    .on('end', () => {

      const ultimaFecha = new Date(Math.max(...fechas));
      const dia = ultimaFecha.toISOString().split('T')[0];

      let total = 0;
      const ordenes = new Set();

      data.forEach(row => {

        const fecha = new Date(row['Fecha de creación']);
        const fechaFila = fecha.toISOString().split('T')[0];

        if (fechaFila !== dia) return;

        const ordenId = row['ID de la orden'];

        let precio = row['Precio con descuento'];

        if (precio) {
          precio = precio
            .toString()
            .replace(/\$/g, '')
            .replace(/\./g, '')
            .replace(/,/g, '');
        }

        ordenes.add(ordenId);
        total += Number(precio) || 0;

      });

      res.json({
        ordenes: ordenes.size,
        ventas: total,
        fecha: dia
      });

    });

});

app.listen(3000, () => {
  console.log('🚀 Panel en http://localhost:3000');
});