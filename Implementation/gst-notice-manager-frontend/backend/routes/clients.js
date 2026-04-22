const router = require("express").Router();
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, async (req, res) => {
  try {
    const { category } = req.query;
    const hasCategory = typeof category === "string" && category.length > 0;

    const params = [];
    let where = "";
    if (hasCategory) {
      params.push(category);
      where = `WHERE c.category = $1`;
    }

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.gstin,
        c.category,
        c.contact_email,
        c.contact_phone,
        c.state,
        c.created_at,
        COUNT(cs.id)::int AS active_cases
      FROM clients c
      LEFT JOIN cases cs ON cs.client_gstin = c.gstin
      ${where}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      `,
      params
    );

    res.json(
      result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        gstin: r.gstin,
        category: r.category,
        contactEmail: r.contact_email || undefined,
        contactPhone: r.contact_phone || undefined,
        state: r.state || "—",
        activeCases: r.active_cases ?? 0,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error loading clients" });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const {
      name,
      gstin,
      category = "other",
      contactEmail = null,
      contactPhone = null,
      state = "—",
    } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Client name is required." });
    }
    if (!gstin || typeof gstin !== "string" || !/^[0-9A-Z]{15}$/.test(gstin.trim())) {
      return res.status(400).json({ error: "Valid GSTIN is required (15 chars, uppercase)." });
    }

    const cleaned = {
      name: name.trim(),
      gstin: gstin.trim().toUpperCase(),
      category,
      contactEmail: typeof contactEmail === "string" ? contactEmail.trim() : null,
      contactPhone: typeof contactPhone === "string" ? contactPhone.trim() : null,
      state: typeof state === "string" && state.trim().length > 0 ? state.trim() : "—",
    };

    const existing = await pool.query(
      `SELECT id FROM clients WHERE gstin=$1 LIMIT 1`,
      [cleaned.gstin]
    );

    let row;
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `
        UPDATE clients
        SET
          name = $1,
          category = $2,
          contact_email = $3,
          contact_phone = $4,
          state = $5
        WHERE id = $6
        RETURNING id, name, gstin, category, contact_email, contact_phone, state, created_at
        `,
        [
          cleaned.name,
          cleaned.category,
          cleaned.contactEmail,
          cleaned.contactPhone,
          cleaned.state,
          existing.rows[0].id,
        ]
      );
      row = updated.rows[0];
    } else {
      const inserted = await pool.query(
        `
        INSERT INTO clients (id, name, gstin, category, contact_email, contact_phone, state)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, name, gstin, category, contact_email, contact_phone, state, created_at
        `,
        [
          uuidv4(),
          cleaned.name,
          cleaned.gstin,
          cleaned.category,
          cleaned.contactEmail,
          cleaned.contactPhone,
          cleaned.state,
        ]
      );
      row = inserted.rows[0];
    }

    res.json({
      id: row.id,
      name: row.name,
      gstin: row.gstin,
      category: row.category,
      contactEmail: row.contact_email || undefined,
      contactPhone: row.contact_phone || undefined,
      state: row.state || "—",
      activeCases: 0,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving client" });
  }
});

module.exports = router;

