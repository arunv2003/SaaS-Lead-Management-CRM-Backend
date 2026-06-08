import express from "express";

import { verifyToken } from "../../middlewares/verifyToken.js";
import {
  createPlan,
  deletePlan,
  getAllPlans,
  updatePlan,
} from "../../controller/plans/plans.controller.js";

const router = express.Router();

router.route("/create").post(verifyToken, createPlan);
router.route("/get-all").get(getAllPlans);
router.route("/:id").put(verifyToken, updatePlan);
router.route("/:id").delete(verifyToken, deletePlan);

export default router;
