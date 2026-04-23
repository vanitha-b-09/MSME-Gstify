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

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".xls",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".tif",
  ".tiff",
  ".heic",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
]);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// STORAGE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const extensionOk = ALLOWED_EXTENSIONS.has(extension);
  const mimeOk = !file.mimetype || ALLOWED_MIME_TYPES.has(file.mimetype);

  if (!extensionOk || !mimeOk) {
    const error = new Error(
      "Only PDF, Excel, and image files are allowed (including handwritten bill images)."
    );
    error.code = "INVALID_FILE_TYPE";
    return cb(error);
  }

  cb(null, true);
};

const fileHashFromDisk = async (filePath) => {
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILE_COUNT,
  },
});

// 🔥 BULK UPLOAD SUPPORT
router.post("/", auth, (req, res) => {
  upload.array("files", MAX_FILE_COUNT)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "Each file must be less than 20MB." });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res
            .status(400)
            .json({ error: `You can upload up to ${MAX_FILE_COUNT} files at once.` });
        }
      }

      if (err.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({ error: err.message });
      }

      return res.status(400).json({ error: "Invalid upload request." });
    }

    try {
      const { case_id, file_type } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded." });
      }

      let savedCount = 0;
      let duplicateCount = 0;

      for (const file of req.files) {
        const diskPath = path.join(uploadsDir, file.filename);
        const fileHash = await fileHashFromDisk(diskPath);

        const existing = await pool.query(
          `SELECT id FROM gst_files WHERE case_id=$1 AND file_hash=$2 LIMIT 1`,
          [case_id, fileHash]
        );

        if (existing.rows.length > 0) {
          duplicateCount += 1;
          try {
            await fs.promises.unlink(diskPath);
          } catch {
            // If cleanup fails, keep request successful; duplicate row is still prevented.
          }
          continue;
        }

        await pool.query(
          `INSERT INTO gst_files (id, case_id, file_type, file_key, file_hash)
           VALUES ($1,$2,$3,$4,$5)`,
          [uuidv4(), case_id, file_type || "mixed", file.filename, fileHash]
        );

        savedCount += 1;
      }

      if (savedCount === 0 && duplicateCount > 0) {
        return res.status(200).json({
          message: "All selected files were duplicates for this case.",
          savedCount,
          duplicateCount,
        });
      }

      res.json({
        message: "Upload success ✅",
        savedCount,
        duplicateCount,
      });
    } catch (serverError) {
      console.error(serverError);
      res.status(500).json({ error: "Upload error" });
    }
  });
});

router.get("/case/:caseId", auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const result = await pool.query(
      `SELECT id, case_id, file_type, file_key, created_at
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

router.delete("/file/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const result = await pool.query(
      `DELETE FROM gst_files
       WHERE id=$1
       RETURNING file_key`,
      [fileId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "File not found" });

    const fileKey = result.rows[0].file_key;
    const diskPath = path.join(uploadsDir, fileKey);
    try {
      await fs.promises.unlink(diskPath);
    } catch {
      // ignore missing file on disk
    }

    res.json({ message: "File removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error removing file" });
  }
});

module.exports = router;