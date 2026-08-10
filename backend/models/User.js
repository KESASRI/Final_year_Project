const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: {
    type: String,
    enum: ["USER", "OWNER", "ADMIN"],
    default: "USER"
  },
  publicKey: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
