import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  firstName: { type: String, required: false },
  lastName: { type: String, required: false },
  email: { type: String, required: false },
  mobile: { type: Number, required: true, index: true },
  role: { type: String, default: "user" },
  otp: { type: String, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  age: { type: Number },
  adhaarCard: {
    frontImage: String,
    backImage: String,
  },
  createdAt: { type: Date, default: Date.now, expires: 300 } // auto-delete after 5 mins
});

const OtpModel = mongoose.model("Otp", otpSchema);

export default OtpModel;
