const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  filename: { type: String, required: true },
  publicKey: { type: String, required: true }, // User RSA public key (PEM)
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "DENIED"],
    default: "PENDING"
  },
  keyExpiry: Date,
  approvedAt: Date
}, { timestamps: true });

module.exports = mongoose.model("Request", RequestSchema);
