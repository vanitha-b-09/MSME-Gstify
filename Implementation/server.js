require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

async function initDB() {
  try {
    console.log("Initializing DB...");

    // -----------------------------
    // USERS TABLE
    // -----------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'ca',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // -----------------------------
    // CASES TABLE
    // -----------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id uuid PRIMARY KEY,
        client_name text NOT NULL,
        client_gstin text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS reconciliation_data jsonb;
    `);

    // -----------------------------
    // CLIENTS TABLE
    // -----------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        gstin text UNIQUE NOT NULL,
        category text NOT NULL DEFAULT 'other',
        contact_email text,
        contact_phone text,
        state text NOT NULL DEFAULT '—',
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // -----------------------------
    // GST FILES TABLE
    // -----------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gst_files (
        id uuid PRIMARY KEY,
        case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        file_type text NOT NULL DEFAULT 'mixed',
        file_key text NOT NULL,
        file_hash text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // -----------------------------
    // 🔥 FORCE FIX ca_id (MAIN FIX)
    // -----------------------------
    console.log("Fixing ca_id columns...");

    try {
      // Drop broken columns (if they exist as INTEGER)
      await pool.query(`
        ALTER TABLE clients DROP COLUMN IF EXISTS ca_id;
        ALTER TABLE cases DROP COLUMN IF EXISTS ca_id;
      `);

      // Recreate correctly as TEXT
      await pool.query(`
        ALTER TABLE clients ADD COLUMN ca_id text;
        ALTER TABLE cases ADD COLUMN ca_id text;
      `);

      console.log("ca_id fixed to TEXT ✅");
    } catch (err) {
      console.error("ca_id fix failed ❌", err.message);
    }

    console.log("DB tables ready ✅");

    // -----------------------------
    // ✅ MIGRATION (SAFE NOW)
    // -----------------------------
    try {
      const firstCA = await pool.query(
        `SELECT id FROM users WHERE role = 'ca' ORDER BY created_at ASC LIMIT 1`
      );

      if (firstCA.rows.length > 0) {
        const caId = String(firstCA.rows[0].id);

        const updatedClients = await pool.query(
          `UPDATE clients SET ca_id = $1 WHERE ca_id IS NULL`,
          [caId]
        );

        const updatedCases = await pool.query(
          `UPDATE cases SET ca_id = $1 WHERE ca_id IS NULL`,
          [caId]
        );

        console.log(
          `Migration ✅ — clients: ${updatedClients.rowCount}, cases: ${updatedCases.rowCount}`
        );
      } else {
        console.log("No CA users found — migration skipped");
      }
    } catch (err) {
      console.error("Migration failed ❌", err.message);
    }

  } catch (err) {
    console.error("DB init failed ❌", err);
  }
}

initDB();

// -----------------------------
// TEST ROUTE
// -----------------------------
app.get("/", (req, res) => {
  res.send("API Running ✅");
});

// -----------------------------
// ROUTES
// -----------------------------
app.use("/auth", require("./routes/auth"));
app.use("/cases", require("./routes/cases"));
app.use("/upload", require("./routes/upload"));
app.use("/reconcile", require("./routes/reconcile"));
app.use("/clients", require("./routes/clients"));

// -----------------------------
// START SERVER
// -----------------------------
app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});