const log = require('lib/log');
const { Pool } = require('pg');

require('dotenv').config();

// load environment variables for postgresql
const {
  PG_USER: user,
  PG_HOST: host,
  PG_DATABASE: database,
  PG_PASSWORD: password,
  PG_PORT: port,
  PG_MAXPOOLS: max
} = process.env;

// postgres connection options
const pool = new Pool({
  user,
  host,
  database,
  password,
  port,
  max
});

// run query using connection pool
exports.run = async function(query) {
  const client = await pool.connect();
  try {
    const res = await client.query(query);
    // console.log(res.rows.length);
    client.release();
    return res.rows;
  } catch (e) {
    log.error(e);
    client.release();
    return null;
  }
};

// module.exports = test;

// // Clear For published Table and reset sequence
// module.exports.runQuery = function(query, callback) {
//     // console.log(query);
// 	pgdb.any(query).then(function(data) {
//         // console.log('query success');
//         // console.log(typeof(data));
//         // console.log(data);
// 		callback({"error": null, "data":data});
// 	}).catch(error => {
//         console.log(error);
//         callback({"error": error});
//     });
// }