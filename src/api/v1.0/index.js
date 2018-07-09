
const Router = require('koa-router');
const bitcoin = require('./bitcoin');

const api = new Router();

api.use('/bitcoin', bitcoin.routes());

module.exports = api;