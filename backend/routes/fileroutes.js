const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  uploadFile,
  listFiles,
  downloadEncryptedFile
} = require("../controllers/fileController");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, "..", "uploads") });

// OWNER uploads encrypted files.
router.post("/upload", authRequired, requireRole("OWNER"), upload.single("file"), uploadFile);

// All logged-in roles can view file list.
router.get("/files", authRequired, listFiles);

// USER can download encrypted file bytes after approval.
router.get("/encrypted-file", authRequired, requireRole("USER"), downloadEncryptedFile);

module.exports = router;
