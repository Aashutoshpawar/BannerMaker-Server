const mongoose = require("mongoose");

const authSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String },
  otpExpiry: { type: Number },
  refreshToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("User", authSchema);
