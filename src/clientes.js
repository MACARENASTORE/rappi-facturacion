const alegra = require('./alegra');

async function crearCliente(cliente) {

  const doc = cliente.documento || '222222222221';

  try {
    const res = await alegra.get('/contacts', {
      params: { query: doc }
    });

    const existente = res.data.find(c => c.identification == doc);

    if (existente) {
      console.log(`🧾 ${doc} → ✅ Cliente ya existe`);
      return existente.id;
    }

  } catch {}

  try {
    const res = await alegra.post('/contacts', {
      nameObject: {
        firstName: cliente.nombre || 'Cliente',
        lastName: 'Rappi'
      },
      identificationObject: {
        type: "CC",
        number: doc
      },
      kindOfPerson: "PERSON_ENTITY"
    });

    console.log(`🧾 ${doc} → 🆕 Cliente creado`);

    return res.data.id;

  } catch (error) {

    if (error.response?.data?.code === 2006) {
      console.log(`🧾 ${doc} → ⚠️ Ya existía`);
      return error.response.data.contactId;
    }

    console.log(`❌ Cliente ${doc}`, error.response?.data);
    return null;
  }
}

module.exports = { crearCliente };