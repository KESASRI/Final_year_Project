const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authRequired, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "USER").toUpperCase();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }

    const normalizedRole = normalizeRole(role);
    if (!["USER", "OWNER", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: normalizedRole
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        hasPublicKey: Boolean(user.publicKey)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Login failed" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("username email role publicKey");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      hasPublicKey: Boolean(user.publicKey)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.put("/public-key", authRequired, async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || !publicKey.includes("BEGIN PUBLIC KEY")) {
      return res.status(400).json({ message: "Valid PEM publicKey is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { publicKey: publicKey.trim() },
      { new: true }
    ).select("username email role publicKey");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      message: "Public key saved",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        hasPublicKey: Boolean(user.publicKey)
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to save public key" });
  }
});

module.exports = router;
