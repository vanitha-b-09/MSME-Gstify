const router = require("express").Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const auth = require("../middleware/authMiddleware");
router.get("/", (req, res) => {
  res.send("Auth route working ✅");
});

const toUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await pool.query("SELECT id FROM users WHERE email=$1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [uuidv4(), String(name).trim(), normalizedEmail, hash, role === "admin" ? "admin" : "ca"]
    );

    const user = toUser(result.rows[0]);
    const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Signup error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [String(email).trim().toLowerCase()]
    );

    if (user.rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const valid = await bcrypt.compare(
      password,
      user.rows[0].password_hash
    );

    if (!valid) return res.status(401).json({ message: "Invalid email or password" });

    const safeUser = toUser(user.rows[0]);
    const token = jwt.sign(safeUser, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Login error" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    // req.user comes from JWT; trust it for now to avoid DB round-trip
    // If you later add firmName/phone, you can fetch by req.user.id here.
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: err?.message || "Profile error" });
  }
});

module.exports = router;