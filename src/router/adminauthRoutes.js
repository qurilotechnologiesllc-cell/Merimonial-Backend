import express from "express";
import { adminLogin, adminSignup, adminForgotPassword, adminResetPassword, adminVerifyOtp, getAdminProfile, updateAdminBasicInfo, updateAdminSecurity, updateAdminPreferences } from "../controller/adminauthController.js"
import upload from "../middlewares/multer.js";
import { authenticateUser } from "../middlewares/authMiddleware.js"
const router = express.Router();

/* ------------------- Admin Routes ------------------- */

router.post("/admin/signup", adminSignup);
router.post("/admin/login", adminLogin);
router.get("/admin/profile", authenticateUser, getAdminProfile);
router.put(
    "/admin/update-basic/profile",
    authenticateUser,
    upload.single("profileImage"),   // THIS FIXES EVERYTHING
    updateAdminBasicInfo
);
router.post("/admin/forgot-password", adminForgotPassword);
router.post("/admin/verify-otp", adminVerifyOtp);
router.post("/admin/reset-password", adminResetPassword);
router.put("/admin/update/security", authenticateUser, updateAdminSecurity);
router.put("/admin/update-profile/preferences", authenticateUser, updateAdminPreferences);


export default router;