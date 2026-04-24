const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool
  .connect()
  .then((client) => {
    console.log("DB Connected ✅");
    client.release();
  })
  .catch((err) => console.error("DB Error ❌", err));

pool.on("error", (err) => {
  console.error("Unexpected DB error ❌", err.message);
});

module.exports = pool;