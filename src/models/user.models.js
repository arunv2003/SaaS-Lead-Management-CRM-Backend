import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "plans",
      default: null,
    },
    role: {
      type: String,
      enum: ["super_admin", "staff", "admin"],
      default: "staff",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true },
);

export const userModel = mongoose.model("users", userSchema);
