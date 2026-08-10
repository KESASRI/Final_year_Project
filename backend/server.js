const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./db");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/fileroutes");
const adminRoutes = require("./routes/adminroutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api", fileRoutes);
app.use("/api/admin", adminRoutes);

app.listen(5000, () => console.log("Server running on 5000"));
