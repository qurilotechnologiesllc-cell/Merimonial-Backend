import bcrypt from "bcryptjs";
import Admin from "../modal/adminModal.js";
import OtpModel from "../modal/OtpModel.js";
import { generateToken } from "../middlewares/authMiddleware.js"
import { sendOtpToPhone } from "../utils/sendOtp.js"

/* ------------------- Admin Login SignUp Api ------------------- */
export const adminSignup = async (req, res) => {
    try {
        const { name, email, password, role , phone} = req.body;
        const existingUser = await Admin.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Admin already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Admin({ name, email, password: hashedPassword, role, phone });
        await newUser.save();

        const token = await generateToken(newUser);

        res.status(201).json({
            success: true,
            message: "Admin created Successfully!",
            token
        });
    } catch (err) {
        res.status(500).json({ message: "Signup failed", error: err.message });
    }
};

export const adminLogin = async (req, res) => {
    
    try {
        const { email, password } = req.body;
        const user = await Admin.findOne({ email });
        if (!user) return res.status(404).json({ message: "Admin not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = await generateToken(user);

        res.status(200).json({ status: "success", message: "Login successfully!", token, });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
};

export const adminForgotPassword = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        // FIND ADMIN USING PHONE FIELD
        const adminUser = await Admin.findOne({ phone });

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: "Admin not found with this phone number",
            });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        await OtpModel.deleteMany({ mobile: phone });

        await OtpModel.create({
            firstName: adminUser.name,
            email: adminUser.email,
            mobile: phone,
            otp,
        });

        await sendOtpToPhone(phone, otp);

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
            otp,
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const adminVerifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone and OTP are required",
            });
        }

        const otpRecord = await OtpModel.findOne({ mobile: phone }).sort({ createdAt: -1 });

        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP",
            });
        }

        await OtpModel.deleteMany({ mobile: phone });

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (error) {
        console.error("OTP Verify Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const adminResetPassword = async (req, res) => {
    try {
        const { phone, newPassword, confirmPassword } = req.body;

        if (!phone || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match",
            });
        }

        const adminUser = await Admin.findOne({ phone });

        if (!adminUser) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        // If OTP exists → not verified yet
        const otpRecord = await OtpModel.findOne({ mobile: phone });
        if (otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Please verify OTP before resetting password",
            });
        }

        adminUser.password = await bcrypt.hash(newPassword, 10);
        await adminUser.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
            adminId: adminUser._id,
        });

    } catch (error) {
        console.error("Reset Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};

export const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.userId; // set by authenticateUser()

        const admin = await Admin.findById(adminId).select("-password");
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        res.status(200).json({
            success: true,
            data: {
                name: admin.name,
                email: admin.email,
                phone: admin.phone || "",
                role: admin.role || "Admin",
                profileImage: admin.profileImage || "",
                assignedRegion: admin.assignedRegion || "All India",

                // Security
                twoFactor: admin.twoFactor || false,
                suspiciousLoginAlert: admin.suspiciousLoginAlert || false,
                recentLoginDevice: admin.recentLoginDevice || "Desktop",

                // Preferences
                language: admin.language || "English",
                theme: admin.theme || "light",
                notifications: admin.notifications ?? true,
                landingPage: admin.landingPage || "Dashboard",
            }
        });

    } catch (error) {
        console.error("GET ADMIN PROFILE ERROR:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

export const updateAdminBasicInfo = async (req, res) => {
    try {
        const adminId = req.user.userId;

        // form-data fields come via req.body
        const { name, email, phone, assignedRegion } = req.body;

        // Profile image via Multer (optional)
        const profileImage = req.file ? req.file.path : null;

        const updateFields = {};

        // Only apply if field exists
        if (name !== undefined) updateFields.name = name;
        if (email !== undefined) {
            // Check duplicate email only when provided
            const emailExists = await Admin.findOne({
                email,
                _id: { $ne: adminId }
            });

            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: "Email already in use by another admin",
                });
            }

            updateFields.email = email;
        }

        if (phone !== undefined) updateFields.phone = phone;
        if (assignedRegion !== undefined)
            updateFields.assignedRegion = assignedRegion;

        if (profileImage) updateFields.profileImage = profileImage;

        // If no fields provided
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        const updated = await Admin.findByIdAndUpdate(
            adminId,
            updateFields,
            { new: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Basic info updated successfully",
            data: updated,
        });

    } catch (error) {
        console.error("UPDATE ADMIN BASIC INFO:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export const updateAdminSecurity = async (req, res) => {
    try {
        const adminId = req.user.userId;

        const {
            newPassword,              // 🔥 only new password needed
            twoFactor,
            suspiciousLoginAlert,
            recentLoginDevice
        } = req.body;

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        const toBool = (v) => {
            if (v === true || v === "true") return true;
            if (v === false || v === "false") return false;
            return undefined;
        };

        let updateFields = {};

        /* ------------------------------
           1️⃣ DIRECT PASSWORD CHANGE
        ------------------------------ */
        if (newPassword) {
            updateFields.password = await bcrypt.hash(newPassword, 10);
        }

        /* ------------------------------
           2️⃣ TWO FACTOR
        ------------------------------ */
        if (twoFactor !== undefined) {
            updateFields.twoFactor = toBool(twoFactor);
        }

        /* ------------------------------
           3️⃣ ALERT ON LOGIN
        ------------------------------ */
        if (suspiciousLoginAlert !== undefined) {
            updateFields.suspiciousLoginAlert = toBool(suspiciousLoginAlert);
        }

        /* ------------------------------
           4️⃣ RECENT LOGIN DEVICE
        ------------------------------ */
        if (recentLoginDevice !== undefined) {
            updateFields.recentLoginDevice = recentLoginDevice;
        }

        /* ------------------------------
           NOTHING SENT?
        ------------------------------ */
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            updateFields,
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Security settings updated successfully",
            data: updatedAdmin
        });

    } catch (error) {
        console.error("SECURITY UPDATE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};

export const updateAdminPreferences = async (req, res) => {
    try {
        const adminId = req.user.userId;
        let { language, theme, notifications, landingPage } = req.body;

        // Convert boolean strings to true/false
        const toBool = (value) => {
            if (value === true || value === "true") return true;
            if (value === false || value === "false") return false;
            return undefined;
        };

        // Allowed values (optional but recommended)
        const allowedThemes = ["light", "dark", "system"];
        const allowedLanguages = ["English", "Hindi", "Tamil", "Telugu", "Bengali"];
        const allowedLandingPages = ["Dashboard", "Users", "Reports", "Settings"];

        const updateFields = {};

        if (language !== undefined) {
            updateFields.language = allowedLanguages.includes(language)
                ? language
                : "English";
        }

        if (theme !== undefined) {
            updateFields.theme = allowedThemes.includes(theme)
                ? theme
                : "light";
        }

        if (notifications !== undefined) {
            updateFields.notifications = toBool(notifications);
        }

        if (landingPage !== undefined) {
            updateFields.landingPage = allowedLandingPages.includes(landingPage)
                ? landingPage
                : "Dashboard";
        }

        // Ensure at least one field is being updated
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid preference fields provided",
            });
        }

        const updated = await Admin.findByIdAndUpdate(
            adminId,
            updateFields,
            { new: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Admin not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Preferences updated successfully",
            data: updated,
        });

    } catch (error) {
        console.error("PREFERENCES UPDATE ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message
        });
    }
};