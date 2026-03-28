import RegisterModel from "../modal/register.js";
import OtpModel from "../modal/OtpModel.js";
import { sendOTPviaSMS } from "../utils/sendOtp.js";
import { generateToken } from "../middlewares/authMiddleware.js"
import Admin from "../modal/adminModal.js";
import Notification from "../modal/Notification.js";


/* ------------------- Helper to generate vmId ------------------- */
const generateUniqueVmId = async () => {
  let isUnique = false;
  let vmId;
  while (!isUnique) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    vmId = `vm${randomNum}`;
    const existing = await RegisterModel.findOne({ vmId });
    if (!existing) isUnique = true;
  }
  return vmId;
};
// ---------------------- User-Auth-Section ---------------------

export const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, role, gender, age } = req.body;

    const adhaarFront = req.files?.["adhaarCardFrontImage"]?.[0]?.path;
    const adhaarBack = req.files?.["adhaarCardBackImage"]?.[0]?.path;

    if (!firstName || !lastName || !mobile || !age) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    if (age < 18) {
      return res.status(404).json({ success: false, message: "You are not able to SignIn in Only 18+ users are allowed!" })
    }

    // check if user already exists
    const existingUser = await RegisterModel.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists with this mobile" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save to OTP collection
    await OtpModel.create(
      {
        firstName,
        lastName,
        email,
        mobile,
        otp,
        role,
        gender,
        age,
        adhaarCard: {
          frontImage: adhaarFront,
          backImage: adhaarBack
        }
      }
    );

    // send OTP to user
    const response = await sendOTPviaSMS(mobile, otp);

    res.status(200).json({ success: true, message: "OTP sent successfully", otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "OTP request failed", error: error.message });
  }
};


export const verifyOtpAndRegister = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ success: false, message: "Mobile and OTP are required" });
    }

    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });
    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    // delete OTP after verification
    await OtpModel.deleteMany({ mobile });

    const vmId = await generateUniqueVmId();

    // Save user to RegisterModel
    const newUser = await RegisterModel.create({
      vmId: vmId,
      firstName: existingOtp.firstName,
      lastName: existingOtp.lastName,
      email: existingOtp.email,
      mobile,
      gender: existingOtp.gender,
      age: existingOtp.age,
      role: existingOtp.role,
      adhaarCard:{
        frontImage: existingOtp.adhaarCard.frontImage,
        backImage: existingOtp.adhaarCard.backImage,
      },
      isMobileVerified: true,
    });

    const token = await generateToken(newUser);

    /* =====================================================
   🔔 NOTIFY ADMIN — NEW USER REGISTERED
===================================================== */

    const io = global.io;
    const admin = await Admin.findOne({ role: "Admin" });

    if (admin) {
      // 💾 Save notification in DB
      const adminNotification = await Notification.create({
        user: admin._id,
        userModel: "Admin",
        title: "New user registered",
        message: `${newUser.firstName} ${newUser.lastName} has just created an account.`,
        read: false
      });

      io?.to(String(admin._id)).emit("new-notification", adminNotification);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      userId: newUser._id,
      vmId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
};


export const loginwithOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) return res.status(400).json({ success: false, message: "Mobile is required" });

    const user = await RegisterModel.findOne({ mobile });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP
    await OtpModel.create({ mobile, otp });

    // Send OTP
    await sendOTPviaSMS(mobile, otp);

    res.status(200).json({ success: true, message: "OTP sent successfully", otp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
  }
};


export const verifyLoginOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        success: false,
        message: "Mobile and OTP are required"
      });
    }

    const user = await RegisterModel.findOne({ mobile });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.adminApprovel !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your account is not approved by Admin Please wait for admin approval!"
      });
    }

    const existingOtp = await OtpModel.findOne({ mobile }).sort({ createdAt: -1 });

    if (!existingOtp || existingOtp.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP"
      });
    }

    // 🧹 Delete OTP
    await OtpModel.deleteMany({ mobile });

    // 🔥 UPDATE LAST LOGIN (MAIN FIX 😏)
    user.lastLoginAt = new Date();
    await user.save();

    const token = await generateToken(user);

    let kycStatus = "pending";

    if (user.adhaarCard) {
      if (user.adhaarCard.isVerified) kycStatus = "approved";
      else if (user.adhaarCard.isRejected) kycStatus = "reject";
    }

    return res.status(200).json({
      success: true,
      message: "User Login successfully",
      token,
      kyc: kycStatus,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
};


export const getCurrentUser = async (req, res) => {
  try {

    if (!req.user.userId) {
      return res.status(401).json({ success: false, error: "User not authenticated" });
    }

    // Fetch user from RegisterModel
    const user = await RegisterModel.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("Error in getCurrentUser:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

/* ------------------- Profile User Profile Details ------------------- */
export const registerDetails = async (req, res) => {
  try {
    const profileImage = req.file?.path;
    const profile_public_id = req.file?.filename

    if (Array.isArray(req.body.maritalStatus)) {
      req.body.maritalStatus = req.body.maritalStatus[0];
    }

    const userId = req.user.userId;

    // ✅ Validation: check if user exists
    const existingUser = await RegisterModel.findById(userId);

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "This user does not exist",
      });
    }

    const updateData = {
      ...req.body,
      profileImage,
      profile_public_id
    };

    const updatedUser = await RegisterModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "User profile updated",
      data: updatedUser,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


