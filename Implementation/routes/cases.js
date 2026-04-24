const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");

// GET all cases — only this CA's cases
router.get("/", auth, async (req, res) => {
  try {
    const caId = req.user.id;

    const result = await pool.query(
      `SELECT id, client_name, client_gstin, status, created_at
       FROM cases
       WHERE ca_id = $1
       ORDER BY created_at DESC`,
      [caId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading cases");
  }
});

// GET single case — only if it belongs to this CA
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const caId = req.user.id;

    const result = await pool.query(
      `SELECT id, client_name, client_gstin, status, created_at, reconciliation_data
       FROM cases
       WHERE id = $1 AND ca_id = $2`,
      [id, caId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Case not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading case" });
  }
});

// POST create case — always tagged to this CA
router.post("/", auth, async (req, res) => {
  try {
    const { client_name, client_gstin } = req.body;
    const caId = req.user.id;

    const result = await pool.query(
      `INSERT INTO cases (id, client_name, client_gstin, status, ca_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [uuidv4(), client_name, client_gstin, "open", caId]
    );

    // Best-effort upsert into clients for persistence & discoverability
    try {
      const existingClient = await pool.query(
        `SELECT id FROM clients WHERE gstin = $1 AND ca_id = $2 LIMIT 1`,
        [client_gstin, caId]
      );

      if (existingClient.rows.length > 0) {
        await pool.query(
          `UPDATE clients SET name = $1 WHERE id = $2 AND ca_id = $3`,
          [client_name, existingClient.rows[0].id, caId]
        );
      } else {
        await pool.query(
          `INSERT INTO clients (id, name, gstin, category, ca_id)
           VALUES ($1, $2, $3, 'other', $4)`,
          [uuidv4(), client_name, client_gstin, caId]
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

// DELETE case — only if it belongs to this CA
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const caId = req.user.id;

    const result = await pool.query(
      `DELETE FROM cases WHERE id = $1 AND ca_id = $2 RETURNING id`,
      [id, caId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Case not found" });

    res.json({ message: "Case removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting case" });
  }
});

module.exports = router;