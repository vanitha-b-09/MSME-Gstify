const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, client_name, client_gstin, status, created_at
       FROM cases
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading cases");
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, client_name, client_gstin, status, created_at
       FROM cases
       WHERE id=$1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Case not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading case" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { client_name, client_gstin } = req.body;

    const result = await pool.query(
      `INSERT INTO cases (id, client_name, client_gstin, status)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [uuidv4(), client_name, client_gstin, "open"] // 🔥 default status
    );

    // Best-effort upsert into clients for persistence & discoverability
    try {
      const existingClient = await pool.query(
        `SELECT id FROM clients WHERE gstin=$1 LIMIT 1`,
        [client_gstin]
      );

      if (existingClient.rows.length > 0) {
        await pool.query(
          `UPDATE clients SET name=$1 WHERE id=$2`,
          [client_name, existingClient.rows[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO clients (id, name, gstin, category)
           VALUES ($1, $2, $3, 'other')`,
          [uuidv4(), client_name, client_gstin]
        );
      }
    } catch (e) {
      console.warn("Client upsert skipped:", e?.message || e);
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating case");
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM cases WHERE id=$1 RETURNING id", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Case not found" });
    res.json({ message: "Case removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting case" });
  }
});

module.exports = router;