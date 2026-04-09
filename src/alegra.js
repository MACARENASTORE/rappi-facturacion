require('dotenv').config();
const axios = require('axios');

const alegra = axios.create({
  baseURL: 'https://api.alegra.com/api/v1',
  auth: {
    username: process.env.ALEGRA_EMAIL,
    password: process.env.ALEGRA_API_KEY
  }
});

module.exports = alegra;