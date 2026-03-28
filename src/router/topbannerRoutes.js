import express from "express"
import { uploadBanner, getBanners, deleteBanner, updateBanner } from "../controller/bannerController.js"
import { authenticateUser } from "../middlewares/authMiddleware.js"
import upload from "../middlewares/multer.js"

const bannerrouter = express.Router()

bannerrouter.post("/upload-banner", upload.single("bannerImage"), authenticateUser, uploadBanner)

bannerrouter.get("/access/banner-image", getBanners)

bannerrouter.delete("/delete/banner-images", authenticateUser, deleteBanner)

bannerrouter.put("/update/banner-image", upload.single("bannerImage"), authenticateUser, updateBanner)

export default bannerrouter



