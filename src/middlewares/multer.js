import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";
import path from "path";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const nameWithoutExt = path.parse(file.originalname).name;

    return {
      folder: "chat-files",
      resource_type: "auto",
      type: "upload",
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}-${nameWithoutExt}`,
    };
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
      "application/pdf"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"), false);
    }
  },

  limits: {
    fileSize: 1024 * 1024 * 100, // 100MB
  },
});

export default upload;