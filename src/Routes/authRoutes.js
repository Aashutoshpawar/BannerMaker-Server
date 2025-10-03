const express = require("express");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const router = express.Router();
const Auth = require("../Models/Auth");
const { generateTokens } = require("../utils/jwt");
require("dotenv").config();


// ---------------- SEND OTP ----------------
router.post("/send_otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins

    let user = await Auth.findOne({ email });
    if (!user) user = await Auth.create({ email });

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ error: "Server error while sending OTP" });
  }
});

// ---------------- VERIFY OTP ----------------
router.post("/verify_otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const user = await Auth.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    user.otp = null;
    user.otpExpiry = null;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Server error while verifying OTP" });
  }
});

// ---------------- REFRESH TOKEN ----------------
router.post("/refresh_token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "No refresh token provided" });

    const user = await Auth.findOne({ refreshToken });
    if (!user) return res.status(403).json({ error: "Invalid refresh token" });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(403).json({ error: "Expired or invalid refresh token" });
  }
});

// ---------------- LOGOUT ----------------
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "No refresh token provided" });

    await Auth.updateOne({ refreshToken }, { $unset: { refreshToken: 1 } });
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Server error while logging out" });
  }
});

module.exports = router;
