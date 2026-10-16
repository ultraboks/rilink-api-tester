const serverless = require('serverless-http');
const app = require('../../server'); // pastikan file server.js kamu mengekspor app (module.exports = app)

module.exports.handler = serverless(app);