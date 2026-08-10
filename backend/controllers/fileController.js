const fs = require("fs");
const File = require("../models/File");
const Request = require("../models/Request");
const { encrypt } = require("../utils/encrypt");

// Upload file: encrypt with AES-GCM and store encrypted bytes on disk.
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const plaintext = fs.readFileSync(req.file.path);
    const { encrypted, keyHex, ivHex, authTagHex } = encrypt(plaintext);

    fs.writeFileSync(req.file.path, encrypted);

    const file = await File.create({
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      aesKey: keyHex,
      iv: ivHex,
      authTag: authTagHex
    });

    return res.status(201).json({
      message: "File uploaded and encrypted",
      file: {
        id: file._id,
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Upload/encryption failed" });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const files = await File.find({}, "filename size mimetype createdAt").sort({ createdAt: -1 });
    return res.json(files);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to list files" });
  }
};

// Send encrypted file bytes only if the user has an active approved request.
exports.downloadEncryptedFile = async (req, res) => {
  try {
    const { filename } = req.query;
    const email = req.user.email;

    if (!filename) {
      return res.status(400).json({ message: "filename is required" });
    }

    const approvedRequest = await Request.findOne({
      filename,
      email,
      status: "APPROVED"
    }).sort({ approvedAt: -1, updatedAt: -1 });

    if (!approvedRequest) {
      return res.status(403).json({ message: "No approved request for this file and email" });
    }

    if (!approvedRequest.keyExpiry || new Date() > approvedRequest.keyExpiry) {
      return res.status(403).json({ message: "Key expired. Please request again." });
    }

    const file = await File.findOne({ filename });
    if (!file) return res.status(404).json({ message: "File not found" });
    if (!fs.existsSync(file.path)) return res.status(404).json({ message: "Stored file missing" });

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-IV", file.iv);
    res.setHeader("X-AUTH-TAG", file.authTag);
    res.setHeader("X-ORIGINAL-NAME", encodeURIComponent(file.filename));
    res.setHeader("X-MIME-TYPE", file.mimetype || "application/octet-stream");
    res.setHeader("Access-Control-Expose-Headers", "X-IV, X-AUTH-TAG, X-ORIGINAL-NAME, X-MIME-TYPE");

    const stream = fs.createReadStream(file.path);
    stream.on("error", (error) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Unable to read encrypted file" });
      }
    });

    stream.pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Download failed" });
  }
};
