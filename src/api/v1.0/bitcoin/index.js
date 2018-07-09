const Router = require('koa-router');
const getBitcoinValue = require('./getBitcoinValue');
const createNewWallet = require('./createNewWallet');
const createPushAndConfirmTransaction = require('./createPushAndConfirmTransaction');

const api = new Router();

api.use('/getBitcoinValue', getBitcoinValue.routes());
api.use('/createNewWallet', createNewWallet.routes());
api.use('/createPushAndConfirmTransaction', createPushAndConfirmTransaction.routes());

module.exports = api;