const express = require("express");
const {
  createRequest,
  getRequests,
  approveRequest,
  denyRequest
} = require("../controllers/admincontroller");
const { authRequired, requireRole } = require("../middleware/auth");

const router = express.Router();

// USER creates access request for a file.
router.post("/request", authRequired, requireRole("USER"), createRequest);

// ADMIN manages requests.
router.get("/requests", authRequired, requireRole("ADMIN"), getRequests);
router.post("/approve", authRequired, requireRole("ADMIN"), approveRequest);
router.post("/deny", authRequired, requireRole("ADMIN"), denyRequest);

module.exports = router;
