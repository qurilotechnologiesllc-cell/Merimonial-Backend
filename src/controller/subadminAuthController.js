import { v2 as cloudinary } from "cloudinary";
import SubAdminModel from "../modal/subadminModel.js";
import { generateToken } from "../middlewares/authMiddleware.js";
import bcrypt from "bcryptjs";

const generateUniqueVmId = async () => {
    let isUnique = false;
    let subAdminId;
    while (!isUnique) {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        subAdminId = `vm${randomNum}`;
        const existing = await SubAdminModel.findOne({ subAdminId });
        if (!existing) isUnique = true;
    }
    return subAdminId;
};

export const SubAdminSignUp = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            password,
            status,
            role,
            gender
        } = req.body;

        const user = req.user.role

        // 🔐 Only Admin Allowed
        if (user !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Only Admin can create Sub-admin account",
            });
        }

        const profileImage = req.file?.path;
        const public_id = req.file?.filename;

        // 🔴 Validation
        if (!firstName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Required fields missing",
            });
        }

        // 🔍 Check existing email
        const existingAdmin = await SubAdminModel.findOne({ email });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Sub admin already exists with this email",
            });
        }

        // 🔐 Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🆔 Generate SubAdmin ID
        const subAdminId = await generateUniqueVmId();

        // ✅ Create Sub Admin
        const newSubAdmin = await SubAdminModel.create({
            firstName,
            lastName,
            email,
            role,
            phone,
            password: hashedPassword,
            subAdminId,
            profileImage,
            public_id,
            gender,
            status: status || "pending", // ya "pending" agar approval system chahiye
        });

        // 📤 Response
        return res.status(201).json({
            success: true,
            message: "Sub admin created successfully Please Wait Sub-Admin Approval",
            data: {
                _id: newSubAdmin._id,
                firstName: newSubAdmin.firstName,
                lastName: newSubAdmin.lastName,
                email: newSubAdmin.email,
                role: newSubAdmin.role,
                phone: newSubAdmin.phone,
                subAdminId: newSubAdmin.subAdminId,
                permissions: newSubAdmin.permissions,
                status: newSubAdmin.status,
                gender: newSubAdmin.gender,
                profileImage: newSubAdmin.profileImage,
                public_id: newSubAdmin.public_id
            },
        });

    } catch (error) {
        console.error("SubAdmin Signup Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error", 
            error: error.message,
        });
    }
};

export const SubAdminSignIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 🔴 Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // 🔍 Find SubAdmin
        const subAdmin = await SubAdminModel.findOne({ email });

        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: "Sub admin not found",
            });
        }

        // 🔒 Check Status FIRST (IMPORTANT 🔥)
        if (subAdmin.status === "pending") {
            return res.status(403).json({
                success: false,
                message:
                    "Please wait for super admin approval. Once approved, you can access the dashboard.",
            });
        }

        if (subAdmin.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive. Contact super admin.",
            });
        }

        // 🔐 Compare Password
        const isMatch = await bcrypt.compare(password, subAdmin.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password",
            });
        }

        // 🔑 Generate Token
        const token = await generateToken(subAdmin);

        // 📤 Response
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
        });

    } catch (error) {
        console.error("SubAdmin Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export const AddPermissionTabs = async (req, res) => {
    try {
        const admin = req.user.role;

        // 🔐 Only Admin Allowed
        if (admin !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Only Admin can assign permissions",
            });
        }

        const { subAdminId, permissionTabs } = req.body;

        // 🔴 Validation
        if (!subAdminId || !Array.isArray(permissionTabs)) {
            return res.status(400).json({
                success: false,
                message: "subAdminId and permissionTabs array are required",
            });
        }

        // ✅ Allowed permissions list
        const allowedPermissions = [
            "DASHBOARD",
            "ANALYTICS",
            "MANAGE_USERS",
            "REPORTED_CONTENT",
            "VARIFICATION_REQUEST",
            "PROFILE_DETAILS"
        ];

        // 🧹 Filter valid permissions
        const validPermissions = permissionTabs.filter((perm) =>
            allowedPermissions.includes(perm)
        );

        // 🔍 Find SubAdmin
        const subAdmin = await SubAdminModel.findById(subAdminId);

        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: "Sub admin not found",
            });
        }

        // 🔄 Update permissions (replace old)
        subAdmin.permissions = validPermissions;

        await subAdmin.save();

        return res.status(200).json({
            success: true,
            message: "Permissions updated successfully",
            data: {
                subAdminId: subAdmin._id,
                permissions: subAdmin.permissions,
            },
        });

    } catch (error) {
        console.error("Add Permission Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export const getAllsubAdminList = async (req, res) => {
    try {
        const admin = req.user.role;

        // 🔐 Only Admin Allowed
        if (admin !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Only Admin can view sub-admin list",
            });
        }

        let {
            search = "",
            status = "",
            page = 1,
            limit = 10,
        } = req.query;


        page = Number(page);
        limit = Number(limit);
        const skip = (page - 1) * limit;

        const query = {};

        // 🔍 Search (name, email, phone)
        if (search.trim()) {
            const s = search.trim();

            query.$or = [
                { firstName: { $regex: s, $options: "i" } },
                { lastName: { $regex: s, $options: "i" } },
                { email: { $regex: s, $options: "i" } },
                { phone: { $regex: s, $options: "i" } },
            ];
        }

        // 🟡 Status Filter
        if (status.trim()) {
            query.status = { $regex: `^${status}$`, $options: "i" };
        }

        // 📊 Total Count
        const total = await SubAdminModel.countDocuments(query);

        // 📦 Fetch Data (exclude password 🔥)
        const subAdmins = await SubAdminModel.find(query)
            .select("-password") // ❗ important
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            success: true,
            message: "Sub-admin list fetched successfully",
            data: subAdmins,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        });

    } catch (error) {
        console.error("fetch sub-admin Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export const deleteSubAdminByAdmin = async (req, res) => {
    try {
        const { id } = req.query;

        const role = req.user.role

        // 🔐 Only Admin Allowed
        if (role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Only Admin can delete Sub-admin account",
            });
        }

        // Step 1: Find sub-admin by ID
        const subAdmin = await SubAdminModel.findById(id);
        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: "Sub-admin not found",
            });
        }

        // Step 2: Delete image from Cloudinary using public_id
        if (subAdmin.public_id) {
            const cloudinaryResult = await cloudinary.uploader.destroy(subAdmin.public_id);
            if (cloudinaryResult.result !== "ok") {
                return res.status(500).json({
                    success: false,
                    message: "Failed to delete image from Cloudinary",
                });
            }
        }

        // Step 3: Delete sub-admin from database
        await SubAdminModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Sub-admin deleted successfully",
        });

    } catch (error) {
        console.error("deleteSubAdminByAdmin error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

export const filterSubAdminByStatus = async (req, res) => {
    try {
        const { status } = req.params

        const admin = req.user.role;

        // 🔐 Only Admin Allowed
        if (admin !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Unauthorized! Only Admin can view sub-admin list",
            });
        }

        const response = await SubAdminModel.find({ status }).select("-password").sort({ createdAt: -1 })

        const total = await SubAdminModel.countDocuments({ status })

        return res.status(200).json({
            success: true,
            message: "Sub-admin list fetched successfully",
            response,
            total,
        });

    } catch (error) {
        console.error("fetch sub-admin filter Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
}

export const UpdateSubAdminProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file?.path
        const { firstName, lastName, email, phone, status, role, gender, permissionTabs } = req.body;

        // ✅ New
        let parsedPermissions = [];
        if (permissionTabs) {
            try {
                parsedPermissions = JSON.parse(permissionTabs);
            } catch (e) {
                parsedPermissions = permissionTabs;
            }
        }

        // ✅ Allowed permissions list
        const allowedPermissions = [
            "CAN_VIEW_USER",
            "EDIT_USER_INFO",
            "ACCESS_ANALYTICS",
            "MODERATE_REPORTS",
            "BLOCK_REPORTED_USERS",
        ];

        // ✅ Check if sub-admin exists
        const existingSubAdmin = await SubAdminModel.findById(id);
        if (!existingSubAdmin) {
            return res.status(404).json({ success: false, message: "Sub-admin not found!" });
        }


        // ✅ Check duplicate email (exclude current user)
        if (email && email !== existingSubAdmin.email) {
            const emailExists = await SubAdminModel.findOne({ email, _id: { $ne: id } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email already in use!" });
            }
        }

        // ✅ Safe filter — fallback to [] if permissionTabs is missing
        const validPermissions = (parsedPermissions || []).filter((perm) =>
            allowedPermissions.includes(perm)
        );

        // ✅ Handle image update — replace with same public_id
        let profileImage = existingSubAdmin.profileImage;
        let public_id = existingSubAdmin.public_id;

        if (file) {
            const cloudinaryResult = await cloudinary.uploader.upload(file, {
                public_id: existingSubAdmin.public_id, // 🔁 reuse same public_id
                overwrite: true,                        // 🔁 replace existing image
                invalidate: true,                       // 🧹 clear CDN cache for old image
            });

            profileImage = cloudinaryResult.secure_url;
            public_id = cloudinaryResult.public_id;
        }

        // ✅ Only include fields that are actually sent
        const updatedData = {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(status && { status }),
            ...(role && { role }),
            ...(gender && { gender }),
            permissions: validPermissions,
            profileImage,
            public_id
        };

        const response = await SubAdminModel.findByIdAndUpdate(id, updatedData, {
            new: true,
        });

        return res.status(200).json({
            success: true,
            message: "Sub-Admin updated successfully",
            response,
        });

    } catch (error) {
        console.error("Update Sub-Admin Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};