const alegra = require('./alegra');

async function crearCliente(cliente) {
  try {
    const response = await alegra.post('/contacts', {
      name: cliente.nombre,
      identification: cliente.documento,
      email: cliente.email,
      phonePrimary: cliente.telefono
    });

    console.log("🆕 Cliente creado:", cliente.nombre);

    return response.data.id;

  } catch (error) {

    console.log("⚠️ Cliente ya existe, buscando en lista...");

    try {
      const res = await alegra.get('/contacts');

      const clientes = res.data;

      const encontrado = clientes.find(c => 
        c.identification === cliente.documento
      );

      if (encontrado) {
        console.log("✅ Cliente encontrado:", cliente.documento);
        return encontrado.id;
      }

      console.log("❌ Cliente no encontrado en Alegra");

    } catch (e) {
      console.log("❌ Error real consultando Alegra:", e.response?.data || e.message);
    }

    return null;
  }
}

module.exports = { crearCliente };