import mongoose from 'mongoose';

const accountRequestSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Register",
    required: true
  },

  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Register",
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending"
  }
},
  { timestamps: true }
);

export const AccountRequestModel = mongoose.model('AccountRequest', accountRequestSchema);
