import express from "express"
import { authenticateUser } from "../middlewares/authMiddleware.js"
import { SubAdminSignIn, SubAdminSignUp, AddPermissionTabs, getAllsubAdminList, deleteSubAdminByAdmin, filterSubAdminByStatus, UpdateSubAdminProfile } from "../controller/subadminAuthController.js"
import upload from "../middlewares/multer.js"

const subadminrouter = express.Router()

subadminrouter.post("/signUp", upload.single("profileImage"), authenticateUser , SubAdminSignUp)

subadminrouter.post("/loginIn", SubAdminSignIn)

subadminrouter.post("/add/tab-permission", authenticateUser, AddPermissionTabs)

subadminrouter.get("/all/sub-admin/list", authenticateUser, getAllsubAdminList)

subadminrouter.delete("/delete/sub-admin", authenticateUser, deleteSubAdminByAdmin)

subadminrouter.get("/filter/sub-admin/:status", authenticateUser, filterSubAdminByStatus)

subadminrouter.put("/update/sub-admin-profile/:id", upload.single("profileImage"), UpdateSubAdminProfile)

export default subadminrouter