const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const { generateResponse } = require("./controller");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "AI Engine running", version: "1.0" });
});

// Main endpoint — called by Module 7 (PDF Generator)
// Receives: notice data (from OCR Module 4) + mismatches (from Recon Module 6)
// Returns: structured draft reply JSON
app.post("/api/generate-response", generateResponse);

app.listen(PORT, () => {
  console.log(`AI Engine listening on http://localhost:${PORT}`);
});
