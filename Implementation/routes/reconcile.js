const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");

const uploadsDir = path.join(process.cwd(), "uploads");
const uploadPathCandidates = [
  uploadsDir,
  path.join(__dirname, "..", "uploads"),
  path.join(__dirname, "..", "..", "uploads"),
  path.join(process.cwd(), "..", "uploads"),
];

const resolveFilePath = (fileKey) => {
  const safeFileKey = String(fileKey || "").trim();
  if (!safeFileKey) return null;

  const normalized = safeFileKey.replace(/\\/g, "/");
  const candidates = [
    safeFileKey,
    path.resolve(process.cwd(), safeFileKey),
    ...uploadPathCandidates.map((baseDir) => path.join(baseDir, safeFileKey)),
    ...uploadPathCandidates.map((baseDir) =>
      path.join(baseDir, normalized.replace(/^uploads\//, ""))
    ),
    ...uploadPathCandidates.map((baseDir) =>
      path.join(baseDir, path.basename(safeFileKey))
    ),
  ];

  const direct = candidates.find((candidate) => fs.existsSync(candidate));
  if (direct) return direct;

  const originalName = normalized.replace(/^(\d+)-/, "");
  if (!originalName) return null;
  const matches = [];
  for (const baseDir of uploadPathCandidates) {
    if (!fs.existsSync(baseDir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const entryName = entry.name;
      if (
        entryName === originalName ||
        entryName.endsWith(`-${originalName}`) ||
        entryName.toLowerCase().endsWith(`-${originalName.toLowerCase()}`)
      ) {
        const fullPath = path.join(baseDir, entryName);
        try {
          const stat = fs.statSync(fullPath);
          matches.push({ fullPath, mtimeMs: stat.mtimeMs });
        } catch {
          // Ignore unreadable files.
        }
      }
    }
  }
  if (matches.length > 0) {
    matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return matches[0].fullPath;
  }
  return null;
};

const inferRiskLevel = (mismatches) => {
  if (!Array.isArray(mismatches) || mismatches.length === 0) return "low";
  const levels = mismatches
    .map((item) => String(item?.severity || "").toLowerCase())
    .filter(Boolean);
  if (levels.includes("high") || levels.includes("critical")) return "high";
  if (levels.includes("medium")) return "medium";
  return "low";
};

const detectGstrKind = (file) => {
  const fileType = String(file?.file_type || "").toLowerCase();
  const fileKey = String(file?.file_key || "").toLowerCase();
  const combined = `${fileType} ${fileKey}`;

  if (/gstr[\s\-_]*1\b|\bgstr1\b/.test(combined)) return "gstr1";
  if (/gstr[\s\-_]*3b\b|\bgstr3b\b/.test(combined)) return "gstr3b";
  return null;
};

router.post("/gstr/:caseId", auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const caId = req.user.id;

    const caseCheck = await pool.query(
      `SELECT id FROM cases WHERE id = $1 AND ca_id = $2 LIMIT 1`,
      [caseId, caId]
    );
    if (caseCheck.rows.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }

    let filesResult;
    try {
      filesResult = await pool.query(
        `SELECT id, file_type, parsed_data, file_key
         FROM case_files
         WHERE case_id = $1`,
        [caseId]
      );
    } catch (err) {
      if (err.code !== "42P01") throw err;
      filesResult = await pool.query(
        `SELECT id, file_type, parsed_data, file_key
         FROM gst_files
         WHERE case_id = $1`,
        [caseId]
      );
    }

    const files = filesResult.rows || [];
    let gstr1 = files.find((f) => detectGstrKind(f) === "gstr1");
    let gstr3b = files.find((f) => detectGstrKind(f) === "gstr3b");

    if ((!gstr1 || !gstr3b) && files.length >= 2) {
      // Fallback to first two files so reconciliation can proceed for generic uploads.
      gstr1 = gstr1 || files[0];
      gstr3b = gstr3b || files.find((f) => f.id !== gstr1.id) || files[1];
      console.warn(
        `[RECONCILE] Using fallback file selection for case ${caseId}.`
      );
    }

    if (!gstr1 || !gstr3b) {
      return res.status(400).json({
        message: "Need at least two uploaded files for reconciliation.",
      });
    }

    const gstr1Path = resolveFilePath(gstr1.file_key) || gstr1.file_key;
    const gstr3bPath = resolveFilePath(gstr3b.file_key) || gstr3b.file_key;

    if (!fs.existsSync(gstr1Path) || !fs.existsSync(gstr3bPath)) {
      console.error(
        `[RECONCILE] Missing files on disk. gstr1=${gstr1Path} gstr3b=${gstr3bPath}`
      );
      return res.status(400).json({
        message: "GSTR files are referenced in DB but missing on server disk.",
      });
    }

    let reconciliationResult;
    try {
      const fastApiResponse = await axios.post(
        "http://localhost:8000/reconcile-gstr",
        {
          gstr1_path: gstr1Path,
          gstr3b_path: gstr3bPath,
        },
        { timeout: 60000 }
      );
      reconciliationResult = fastApiResponse.data;
    } catch (fastApiError) {
      console.error("Reconciliation FastAPI error:", fastApiError.message);
      return res.status(500).json({ message: "Reconciliation service failed" });
    }

    const enrichedResult = {
      ...reconciliationResult,
      risk_level: inferRiskLevel(reconciliationResult?.mismatches),
      generated_at: new Date().toISOString(),
      source_files: {
        gstr1_file_id: gstr1.id,
        gstr3b_file_id: gstr3b.id,
      },
    };

    await pool.query(
      `UPDATE cases
       SET reconciliation_data = $1
       WHERE id = $2 AND ca_id = $3`,
      [enrichedResult, caseId, caId]
    );

    return res.json({
      message: "Reconciliation complete",
      data: enrichedResult,
    });
  } catch (err) {
    console.error("Reconciliation route error:", err);
    return res.status(500).json({ message: "Reconciliation failed" });
  }
});

module.exports = router;
