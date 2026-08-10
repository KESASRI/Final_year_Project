const Request = require("../models/Request");
const File = require("../models/File");
const User = require("../models/User");
const { sendWrappedKeyEmail } = require("../utils/mail");
const { wrapAESKeyForUser } = require("../utils/rsa");

exports.createRequest = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ message: "filename is required" });
    }

    const user = await User.findById(req.user.id).select("username email publicKey");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.publicKey) {
      return res.status(400).json({
        message: "Public key not found. Please login again to initialize your key pair."
      });
    }

    const file = await File.findOne({ filename });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const pendingRequest = await Request.findOne({
      email: user.email,
      filename,
      status: "PENDING"
    });

    if (pendingRequest) {
      return res.status(400).json({ message: "You already have a pending request for this file" });
    }

    await Request.create({
      username: user.username,
      email: user.email,
      filename,
      publicKey: user.publicKey
    });

    return res.json({ message: "Your request has been submitted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create request" });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch requests" });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const reqData = await Request.findById(req.body.id);
    if (!reqData) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (reqData.status !== "PENDING") {
      return res.status(400).json({
        message: `Request already ${reqData.status}`
      });
    }

    const file = await File.findOne({ filename: reqData.filename }).select("+aesKey");
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const keyExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const wrappedAesKey = wrapAESKeyForUser(file.aesKey, reqData.publicKey);

    await sendWrappedKeyEmail({
      email: reqData.email,
      filename: reqData.filename,
      wrappedKey: wrappedAesKey,
      expiresAt: keyExpiry
    });

    reqData.status = "APPROVED";
    reqData.keyExpiry = keyExpiry;
    reqData.approvedAt = new Date();
    await reqData.save();

    return res.json({
      message: "Approved. Wrapped AES key sent to user email."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Approval failed" });
  }
};

exports.denyRequest = async (req, res) => {
  try {
    const reqData = await Request.findById(req.body.id);
    if (!reqData) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (reqData.status !== "PENDING") {
      return res.status(400).json({
        message: `Request already ${reqData.status}`
      });
    }

    reqData.status = "DENIED";
    await reqData.save();

    return res.json({ message: "Request denied. No key shared." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Deny failed" });
  }
};
