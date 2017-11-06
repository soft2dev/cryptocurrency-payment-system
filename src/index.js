require('dotenv').config();

const Koa = require('koa');
const Router = require('koa-router');

// api handler
const api = require('./api');
// const db = require('./db');
// const res1 = db.run('SELECT * FROM datastore_user');

// load environment variables
const {
  PORT: port
} = process.env;

// create app for koa
const app = new Koa();
const router = new Router();

// set route for api
router.use('/api', api.routes());
app.use(router.routes());
app.use(router.allowedMethods());

// listen
app.listen(port, () => {
  console.log(`PulsePro is listening to port ${port}`);
});