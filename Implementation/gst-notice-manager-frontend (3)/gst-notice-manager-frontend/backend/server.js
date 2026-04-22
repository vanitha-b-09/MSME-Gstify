require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// Minimal schema bootstrap (safe IF NOT EXISTS)
pool
  .query(
    `
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'ca',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS cases (
      id uuid PRIMARY KEY,
      client_name text NOT NULL,
      client_gstin text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE cases
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    CREATE TABLE IF NOT EXISTS gst_files (
      id uuid PRIMARY KEY,
      case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      file_type text NOT NULL DEFAULT 'mixed',
      file_key text NOT NULL,
      file_hash text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE gst_files
      ADD COLUMN IF NOT EXISTS file_hash text;
    ALTER TABLE gst_files
      ADD COLUMN IF NOT EXISTS file_type text NOT NULL DEFAULT 'mixed';
    ALTER TABLE gst_files
      ADD COLUMN IF NOT EXISTS file_key text;
    ALTER TABLE gst_files
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

    CREATE UNIQUE INDEX IF NOT EXISTS ux_gst_files_case_hash
      ON gst_files(case_id, file_hash)
      WHERE file_hash IS NOT NULL;

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

    ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
    `
  )
  .then(() => console.log("DB tables ready ✅"))
  .catch((err) => console.error("DB tables init failed ❌", err));

// Test route
app.get("/", (req, res) => {
  res.send("API Running ✅");
});

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/cases", require("./routes/cases"));
app.use("/upload", require("./routes/upload"));
app.use("/clients", require("./routes/clients"));

// Start server
app.listen(process.env.PORT, () => {
  console.log("Server running on port", process.env.PORT);
});