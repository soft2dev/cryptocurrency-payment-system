const Router = require('koa-router');

const user = new Router();

const userCtrl = require('./user.ctrl');

user.get('/list', userCtrl.getUserList);

module.exports = user;