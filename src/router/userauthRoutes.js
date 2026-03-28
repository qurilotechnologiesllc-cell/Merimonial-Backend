import express from "express";
import upload from "../middlewares/multer.js";
import { authenticateUser } from "../middlewares/authMiddleware.js";
import {
  registerUser,
  verifyOtpAndRegister, // OTP-based registration
  loginwithOtp,
  verifyLoginOtp,
  getCurrentUser,
  registerDetails,
} from "../controller/userauthController.js";
const authRoute = express.Router();

/* ------------------- User Registation ------------------- */

// User SignUp Request OTP
authRoute.post("/otp-request", upload.fields([
  { name: "adhaarCardFrontImage", maxCount: 1 },
  { name: "adhaarCardBackImage", maxCount: 1 },
]), registerUser);

// User Verify OTP and complete registration
authRoute.post("/verify-otp-register", verifyOtpAndRegister);

/* ------------------- Login User With Otp ------------------- */
authRoute.post("/otp-login-request", loginwithOtp);
authRoute.post("/login", verifyLoginOtp);

// Get current user
authRoute.get("/user", authenticateUser, getCurrentUser);

/* ------------------- User Update Profile ------------------- */
authRoute.post(
  "/profile",
  authenticateUser,
  upload.single("profileImage"),
  registerDetails
);


export default authRoute;
