const alegra = require('./alegra');

async function test() {
  try {
    const res = await alegra.get('/contacts');
    console.log("✅ Conectado a Alegra");
    console.log("Clientes encontrados:", res.data.length);
  } catch (error) {
    console.log("❌ Error conexión:", error.response?.data || error.message);
  }
}

test();