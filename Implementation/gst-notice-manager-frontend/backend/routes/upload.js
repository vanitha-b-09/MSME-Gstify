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
            file_type || "other",
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
    const diskPath = path.join(uploadsDir, fileKey);

    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ message: "File missing on server" });
    }

    return res.sendFile(diskPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading file" });
  }
});

// ================= REPROCESS / RE-EXTRACT =================
router.post("/file/:fileId/reprocess", auth, async (req, res) => {
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
    const diskPath = path.join(uploadsDir, fileKey);

    if (!fs.existsSync(diskPath)) {
      return res.status(404).json({ message: "File missing on server" });
    }

    // Call OCR/parser service again and persist result
    const ocrResponse = await axios.post("http://localhost:8000/parse-notice", {
      file_path: diskPath,
    });

    await pool.query(
      `UPDATE gst_files
       SET parsed_data = $1
       WHERE id = $2`,
      [ocrResponse.data, fileId]
    );

    res.json({ message: "Re-extract success ✅", parsed_data: ocrResponse.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Re-extract failed" });
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