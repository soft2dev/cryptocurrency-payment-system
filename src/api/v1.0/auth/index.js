const Router = require('koa-router');

const auth = new Router();

auth.get('/', (ctx) => {
  console.log('asdfasdf');
  ctx.body = 'routing setting is OK';
});

module.exports = auth;