// openrouter.js
const axios = require('axios');
require('dotenv').config();

const openRouterAPI = axios.create({
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

module.exports = openRouterAPI;
