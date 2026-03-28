import { v2 as cloudinary } from "cloudinary";
import BannerModel from "../modal/BannerModel.js";

export const uploadBanner = async (req, res) => {
  try {
    // ✅ single file
    const file = req.file;
    const user = req.user.role

    if (user !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized! Only Admin can add banners" })
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Banner image required",
      });
    }

    // 🔥 Cloudinary gives this automatically
    const imageUrl = file.path;        // URL
    const publicId = file.filename;    // public_id (multer-storage-cloudinary)

    // ✅ Save in DB
    const banner = await BannerModel.create({
      image: imageUrl,
      public_id: publicId,
    });

    return res.status(201).json({
      success: true,
      message: "Banner uploaded successfully",
      data: banner,
    });

  } catch (error) {
    console.error("[Upload Banner Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getBanners = async (req, res) => {
  try {
    const banners = await BannerModel.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.query;
    const user = req.user.role;

    if (user !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized! Only Admin can delete banners" })
    }

    // 🔍 Find banner first
    const banner = await BannerModel.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // 🔥 Delete from Cloudinary
    if (banner.public_id) {
      await cloudinary.uploader.destroy(banner.public_id);
    }

    // ❌ Delete from DB
    await BannerModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });

  } catch (error) {
    console.error("Delete Banner Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const { id } = req.query;
    const user = req.user.role;
    const file = req.file;

    if (user !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized! Only Admin can update banners" })
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "New banner image is required",
      });
    }

    // 🔍 Find banner first
    const banner = await BannerModel.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // 🔥 Upload new image with SAME public_id (overwrite)
    const result = await cloudinary.uploader.upload(file.path, {
      public_id: banner.public_id,
      overwrite: true,
    });

    // ✅ Update DB (image URL may change version)
    banner.image = result.secure_url;
    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });

  } catch (error) {
    console.error("[Update Banner Error]", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
