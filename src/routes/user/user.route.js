import express from "express";
import {
  createUser,
  loginUser,
  signupUser,
  getAllstaffs,
  updateUser,
  deleteUser,
  getAllTenants,
} from "../../controller/user/user.controller.js";
import { verifyToken } from "../../middlewares/verifyToken.js";

const router = express.Router();

router.route("/signup").post(signupUser);
router.route("/login").post(loginUser);
router.route("/register").post(verifyToken, createUser);
router.route("/tenants").get(verifyToken, getAllTenants);
router.route("/staffs").get(verifyToken, getAllstaffs);
router.route("/:_id").put(verifyToken, updateUser)
router.route("/:_id").delete(verifyToken, deleteUser);

export default router;

