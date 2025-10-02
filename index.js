const express = require("express");
const connectDB = require("./src/Config/db");  // ✅ DB connection
const cors = require('cors');

// ✅ Import routes
const authRoutes = require("./src/Routes/authRoutes");
const creationRoutes = require("./src/Routes/creationRoutes");
const templateRoutes = require('./src/Routes/templateRoutes');
require('dotenv').config();

const app = express();

// ✅ Connect DB
connectDB();

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/creations", creationRoutes);
app.use('/api/templates', templateRoutes);


// ✅ Root route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
// ✅ Wrap with serverless-http
// const serverless = require("serverless-http");
// module.exports = app;
// module.exports.handler = serverless(app);
