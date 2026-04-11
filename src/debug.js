require('dotenv').config();
const alegra = require('./alegra');

async function obtenerMetodos() {
  try {
    const res = await alegra.get('/payment-methods');
    console.log('💳 MÉTODOS DE PAGO:');
    console.log(res.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
}

obtenerMetodos();