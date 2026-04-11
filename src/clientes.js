const alegra = require('./alegra');

// 🔥 SEPARAR NOMBRE
function separarNombre(nombreCompleto) {
  const partes = (nombreCompleto || '').trim().split(' ');

  return {
    firstName: partes[0] || 'Cliente',
    lastName: partes.slice(1).join(' ') || 'General'
  };
}

// 🔥 TRAER TODOS LOS CLIENTES
async function obtenerTodosLosClientes() {
  let clientes = [];
  let start = 0;
  const limit = 100;

  while (true) {
    const res = await alegra.get('/contacts', {
      params: { start, limit }
    });

    if (res.data.length === 0) break;

    clientes = clientes.concat(res.data);
    start += limit;
  }

  return clientes;
}

// 🔥 CREAR O BUSCAR CLIENTE
async function crearCliente(cliente) {

  const nombre = separarNombre(cliente.nombre);

  try {
    const response = await alegra.post('/contacts', {

      // ✅ NUEVO OBLIGATORIO
      nameObject: {
        firstName: nombre.firstName,
        lastName: nombre.lastName
      },

      kindOfPerson: "PERSON_ENTITY",

      identificationObject: {
        type: "CC",
        number: String(cliente.documento)
      },

      email: cliente.email,
      phonePrimary: cliente.telefono
    });

    console.log(`🧾 ${cliente.documento} → 🆕 Cliente creado`);

    return response.data.id;

  } catch (error) {

    const data = error.response?.data;

    // 🔥 SI YA EXISTE
    if (data?.code === 2006 && data?.contactId) {
      console.log(`🧾 ${cliente.documento} → ✅ Cliente ya existe`);
      return data.contactId;
    }

    console.log(`❌ Error creando cliente ${cliente.documento}:`, data || error.message);

    try {
      const clientes = await obtenerTodosLosClientes();

      const encontrado = clientes.find(c => {
        const idAlegra = String(c.identification || '').trim();
        const idCliente = String(cliente.documento || '').trim();
        return idAlegra === idCliente;
      });

      if (encontrado) {
        console.log(`🧾 ${cliente.documento} → ✅ Cliente encontrado`);
        return encontrado.id;
      }

      console.log(`🧾 ${cliente.documento} → ❌ No existe en Alegra`);

    } catch (e) {
      console.log("❌ Error consultando clientes:", e.response?.data || e.message);
    }

    return null;
  }
}

module.exports = { crearCliente };