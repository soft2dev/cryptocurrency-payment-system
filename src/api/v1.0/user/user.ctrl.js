const db = require('db');

exports.getUserList = async (ctx) => {
  try {
    const userData = await db.run('SELECT * FROM datastore_user');
    ctx.body = userData;
  } catch (e) {
    ctx.throw(e, 500);
  }
};