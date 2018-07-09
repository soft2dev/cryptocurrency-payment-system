const Router = require('koa-router');
const router = new Router();
const axios = require('axios');

router.get('/', async (ctx) => {
  const info = await axios('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
  ctx.body = info.data;
});

module.exports = router;