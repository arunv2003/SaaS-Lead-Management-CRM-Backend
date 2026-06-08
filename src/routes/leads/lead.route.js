import express from "express";
import {
  createLead,
  getLeads,
  updateLead,
  deleteLead,
  incomingWebhook,
} from "../../controller/leads/lead.controller.js";
import { verifyToken } from "../../middlewares/verifyToken.js";

const router = express.Router();


router.route("/create").post(verifyToken, createLead);
router.route("/getall").get(verifyToken, getLeads);
router.route("/update/:leadId").patch(verifyToken, updateLead); 
router.route("/update/:leadId").put(verifyToken, updateLead);   
router.route("/:leadId").delete(verifyToken, deleteLead);


router.route("/incoming/:tenantId").post(incomingWebhook);

export default router;
