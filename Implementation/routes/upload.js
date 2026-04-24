const axios = require("axios");
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const pool = require("../db");
const auth = require("../middleware/authMiddleware");

const MAX_FILE_COUNT = 50;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadPathCandidates = [
  uploadsDir,
  path.join(__dirname, "..", "uploads"),
  path.join(__dirname, "..", "..", "uploads"),
  path.join(process.cwd(), "..", "uploads"),
];

const inferFileTypeFromName = (filename, fallbackType) => {
  const normalizedName = String(filename || "").toLowerCase();
  const requestedType = String(fallbackType || "").toLowerCase();

  // Respect explicit non-generic file_type sent by caller.
  if (requestedType && !["mixed", "other", "unknown"].includes(requestedType)) {
    return requestedType;
  }

  if (/gstr[\s\-_]*1\b/.test(normalizedName) || /\bgstr1\b/.test(normalizedName)) {
    return "gstr1";
  }
  if (/gstr[\s\-_]*3b\b/.test(normalizedName) || /\bgstr3b\b/.test(normalizedName)) {
    return "gstr3b";
  }
  if (/invoice|bill/.test(normalizedName)) {
    return "invoice";
  }
  if (/notice|drc|asmt/.test(normalizedName)) {
    return "notice";
  }

  return requestedType || "other";
};

const resolveExistingFilePath = (fileKey) => {
  const safeFileKey = String(fileKey || "").trim();
  if (!safeFileKey) return null;

  const normalizedKey = safeFileKey.replace(/\\/g, "/");
  const candidatePaths = [
    safeFileKey,
    path.resolve(process.cwd(), safeFileKey),
    ...uploadPathCandidates.map((baseDir) => path.join(baseDir, safeFileKey)),
    ...uploadPathCandidates.map((baseDir) =>
      path.join(baseDir, normalizedKey.replace(/^uploads\//, ""))
    ),
    ...uploadPathCandidates.map((baseDir) =>
      path.join(baseDir, path.basename(safeFileKey))
    ),
  ];

  const resolvedPath = candidatePaths.find((candidate) => fs.existsSync(candidate));
  if (resolvedPath) {
    return { resolvedPath, candidatePaths };
  }

  const originalName = normalizedKey.replace(/^(\d+)-/, "");
  if (!originalName) {
    return { resolvedPath: null, candidatePaths };
  }

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
    return { resolvedPath: matches[0].fullPath, candidatePaths };
  }

  return { resolvedPath: null, candidatePaths };
};

// ================= STORAGE =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
  },
});

// ================= HASH =================
const fileHashFromDisk = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });

// ================= UPLOAD =================
router.post("/", auth, (req, res) => {
  upload.array("files", MAX_FILE_COUNT)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const { case_id, file_type } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded." });
      }

      let savedCount = 0;

      for (const file of req.files) {
        const diskPath = path.join(uploadsDir, file.filename);
        const fileHash = await fileHashFromDisk(diskPath);
        const inferredFileType = inferFileTypeFromName(
          file.originalname || file.filename,
          file_type
        );

        // 🔍 Check duplicate
        const existing = await pool.query(
          `SELECT id FROM gst_files WHERE case_id=$1 AND file_hash=$2 LIMIT 1`,
          [case_id, fileHash]
        );

        if (existing.rows.length > 0) {
          await fs.promises.unlink(diskPath).catch(() => {});
          continue;
        }

        // 💾 Save file record
        await pool.query(
          `INSERT INTO gst_files (id, case_id, file_type, file_key, file_hash)
           VALUES ($1,$2,$3,$4,$5)`,
          [
            uuidv4(),
            case_id,
            inferredFileType,
            file.filename,
            fileHash,
          ]
        );

        // ================= OCR =================
        try {
          const fullPath = path.join(
            __dirname,
            "..",
            "uploads",
            file.filename
          );

          const ocrResponse = await axios.post(
            "http://localhost:8000/parse-notice",
            { file_path: fullPath }
          );

          console.log("OCR Result:", ocrResponse.data);

          // ✅ SAVE OCR DATA INTO parsed_data (jsonb column)
          await pool.query(
            `UPDATE gst_files 
             SET parsed_data = $1 
             WHERE file_key = $2`,
            [ocrResponse.data, file.filename]
          );
        } catch (ocrError) {
          console.error("OCR Error:", ocrError.message);
        }

        savedCount++;
      }

      res.json({
        message: "Upload success ✅",
        savedCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Upload error" });
    }
  });
});

// ================= FILE CONTENT (PREVIEW/DOWNLOAD) =================
router.get("/file/:fileId/content", async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await pool.query(
      `SELECT file_key FROM gst_files WHERE id=$1 LIMIT 1`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileKey = result.rows[0].file_key;
    const { resolvedPath } = resolveExistingFilePath(fileKey);
    if (!resolvedPath) {
      return res.status(404).json({ message: "File missing on server" });
    }

    return res.sendFile(resolvedPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading file" });
  }
});

// ================= REPROCESS / RE-EXTRACT =================
router.post("/file/:id/reprocess", auth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[REPROCESS] Incoming request for fileId=${id}`);

    let fileResult;
    let tableName = "case_files";
    try {
      fileResult = await pool.query(
        `SELECT file_key FROM case_files WHERE id = $1 LIMIT 1`,
        [id]
      );
    } catch (dbLookupError) {
      if (dbLookupError && dbLookupError.code === "42P01") {
        // Backward compatibility for existing deployments using gst_files.
        tableName = "gst_files";
        fileResult = await pool.query(
          `SELECT file_key FROM gst_files WHERE id = $1 LIMIT 1`,
          [id]
        );
      } else {
        throw dbLookupError;
      }
    }

    if (tableName === "case_files" && fileResult.rows.length === 0) {
      const fallbackResult = await pool.query(
        `SELECT file_key FROM gst_files WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (fallbackResult.rows.length > 0) {
        fileResult = fallbackResult;
        tableName = "gst_files";
      }
    }

    console.log(
      `[REPROCESS] DB lookup from ${tableName}: rows=${fileResult.rows.length}`
    );

    if (fileResult.rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileKey = String(fileResult.rows[0].file_key || "").trim();
    const { resolvedPath: filePath, candidatePaths: pathCandidates } =
      resolveExistingFilePath(fileKey);

    if (!filePath) {
      console.error(
        `[REPROCESS] file not found on disk for key=${fileKey}; candidates=${pathCandidates.join(
          " | "
        )}`
      );
      return res.status(404).json({ message: "File missing on server" });
    }

    let parsedData;
    try {
      const fastApiResponse = await axios.post(
        "http://localhost:8000/parse-notice",
        { file_path: filePath },
        { timeout: 30000 }
      );
      parsedData = fastApiResponse.data;
      console.log("[REPROCESS] FastAPI response received");
    } catch (fastApiError) {
      console.error("[REPROCESS] FastAPI error:", fastApiError.message);
      return res.status(500).json({ message: "Failed to reprocess file" });
    }

    try {
      const updateResult = await pool.query(
        `UPDATE case_files
         SET parsed_data = $1
         WHERE id = $2`,
        [parsedData, id]
      );
      tableName = updateResult.rowCount > 0 ? "case_files" : tableName;
      if (updateResult.rowCount === 0) {
        const fallbackUpdateResult = await pool.query(
          `UPDATE gst_files
           SET parsed_data = $1
           WHERE id = $2`,
          [parsedData, id]
        );
        if (fallbackUpdateResult.rowCount > 0) {
          tableName = "gst_files";
        }
      }
    } catch (dbUpdateError) {
      if (dbUpdateError && dbUpdateError.code === "42P01") {
        await pool.query(
          `UPDATE gst_files
           SET parsed_data = $1
           WHERE id = $2`,
          [parsedData, id]
        );
        tableName = "gst_files";
      } else {
        throw dbUpdateError;
      }
    }
    console.log(`[REPROCESS] parsed_data updated in ${tableName}`);

    return res.json({
      message: "Re-extraction successful",
      parsed_data: parsedData,
    });
  } catch (err) {
    console.error("Reprocess route error:", err);
    return res.status(500).json({ message: "Re-extract failed" });
  }
});

// ================= FETCH FILES =================
router.get("/case/:caseId",  async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await pool.query(
      `SELECT id, case_id, file_type, file_key, parsed_data, created_at
       FROM gst_files
       WHERE case_id=$1
       ORDER BY created_at DESC`,
      [caseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading files" });
  }
});

// ================= DELETE =================
router.delete("/file/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await pool.query(
      `DELETE FROM gst_files WHERE id=$1 RETURNING file_key`,
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileKey = result.rows[0].file_key;
    const diskPath = path.join(uploadsDir, fileKey);

    await fs.promises.unlink(diskPath).catch(() => {});

    res.json({ message: "File removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing file" });
  }
});

module.exports = router;