import mongoose from "mongoose";

const subAdminSchema = new mongoose.Schema(
    {
        // 👤 BASIC INFO
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        role: {
            type: String,
            default: ""
        },

        gender: { type: String, required: true},

        phone: {
            type: String,
            required: true,
        },

        password: {
            type: String,
            required: true
        },

        subAdminId: {
            type: String,
            required: true,
            unique: true,
        },

        // 🟢 STATUS
        status: {
            type: String,
            enum: ["active", "inactive", "pending"],
            default: "pending",
        },

        // 🔐 PERMISSIONS (ARRAY OBJECT)
        permissions: [
            {
                type: String,
                enum: [
                    "CAN_VIEW_USER",
                    "EDIT_USER_INFO",
                    "ACCESS_ANALYTICS",
                    "MODERATE_REPORTS",
                    "BLOCK_REPORTED_USERS",
                ],
            },
        ],

        // 🖼️ OPTIONAL PROFILE IMAGE
        profileImage: {
            type: String,
            default: null,
        },

        public_id:{
            type:String,
            default:null
        }
    },
    {
        timestamps: true,
    }
);

const SubAdminModel = mongoose.model("SubAdmin", subAdminSchema);

export default SubAdminModel;