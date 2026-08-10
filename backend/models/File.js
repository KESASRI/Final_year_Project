const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, default: 0 },
  mimetype: { type: String, default: "application/octet-stream" },
  aesKey: { type: String, required: true, select: false },
  iv: { type: String, required: true },
  authTag: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("File", FileSchema);
