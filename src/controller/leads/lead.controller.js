import Lead from "../../models/lead.models.js";
import { userModel } from "../../models/user.models.js";
import { getTenantPlan, getTenantStaff } from "../../utils/cache.js";
import { z } from "zod";
import mongoose from "mongoose";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .lowercase()
    .optional()
    .or(z.literal("")),
  phone: z.string().min(5, "Phone is required").trim(),
  status: z.enum(["New", "Contacted", "Converted", "Lost"]).default("New"),
  source: z
    .enum(["Manual", "Meta Ads", "Google Ads", "Website", "Other"])
    .default("Manual"),
  assignedTo: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid assignedTo user ID",
    })
    .optional(),
});

const updateLeadSchema = z.object({
  status: z.enum(["New", "Contacted", "Converted", "Lost"]).optional(),
  assignedTo: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "Invalid assignedTo user ID",
    })
    .nullable()
    .optional(),
});

const webhookLeadSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  email: z
    .string()
    .email("Invalid email")
    .trim()
    .lowercase()
    .optional()
    .or(z.literal("")),
  phone: z.string().min(5, "Phone is required").trim(),
  source: z
    .enum(["Meta Ads", "Google Ads", "Website", "Other"])
    .default("Meta Ads"),
  rawData: z.record(z.any()).optional(),
});

export const createLead = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { role, _id: userId } = req.user;

    const validation = createLeadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.format(),
      });
    }

    const { name, email, phone, status, source, assignedTo } = validation.data;

    const plan = await getTenantPlan(tenantId);
    if (plan && plan.leadLimit != null && plan.leadLimit !== 0) {
      const leadCount = await Lead.countDocuments({
        tenantId,
        isDeleted: false,
      });
      if (leadCount >= plan.leadLimit) {
        return res.status(403).json({
          message: `Plan Limit Exceeded: Your "${plan.name}" plan allows a maximum of ${plan.leadLimit} leads. Please upgrade your plan to add more leads.`,
        });
      }
    }

    let finalAssignedTo = null;
    if (role === "staff") {
      finalAssignedTo = userId;
    } else if (role === "admin") {
      if (assignedTo) {
        const staffMember = await userModel.findOne({
          _id: assignedTo,
          role: "staff",
          createdBy: tenantId,
        });
        if (!staffMember) {
          return res
            .status(400)
            .json({
              message: "Assigned staff member not found in your organization.",
            });
        }
        finalAssignedTo = assignedTo;
      }
    }

    const newLead = await Lead.create({
      tenantId,
      name,
      email: email || undefined,
      phone,
      status,
      source,
      assignedTo: finalAssignedTo,
      createdBy: userId,
    });

    return res.status(201).json({
      message: "Lead created successfully",
      lead: newLead,
    });
  } catch (error) {
    console.error("Error creating manual lead:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getLeads = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { role, _id: userId } = req.user;

    const { status, source, assignedTo } = req.query;

    const query = { tenantId, isDeleted: false };

    if (role === "staff") {
      query.assignedTo = userId;
    } else if (role === "admin" || role === "super_admin") {
      if (assignedTo) {
        if (mongoose.Types.ObjectId.isValid(assignedTo)) {
          query.assignedTo = assignedTo;
        } else {
          return res
            .status(400)
            .json({ message: "Invalid assignedTo ID filter" });
        }
      }
    }

    if (status) query.status = status;
    if (source) query.source = source;

    const leads = await Lead.find(query)
      .populate("assignedTo", "name email phone")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Leads retrieved successfully",
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateLead = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { role, _id: userId } = req.user;
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ message: "Invalid Lead ID" });
    }

    const validation = updateLeadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.format(),
      });
    }

    const { status, assignedTo } = validation.data;

    const lead = await Lead.findOne({
      _id: leadId,
      tenantId,
      isDeleted: false,
    });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (role === "staff") {
      if (
        !lead.assignedTo ||
        lead.assignedTo.toString() !== userId.toString()
      ) {
        return res
          .status(403)
          .json({
            message:
              "Access Denied: You can only update leads assigned to you.",
          });
      }
      if (assignedTo !== undefined) {
        return res
          .status(403)
          .json({ message: "Access Denied: Only Admins can re-assign leads." });
      }

      if (status) {
        lead.status = status;
      }
    } else if (role === "admin" || role === "super_admin") {
      if (status) {
        lead.status = status;
      }

      if (assignedTo !== undefined) {
        if (assignedTo === null) {
          lead.assignedTo = null;
        } else {
          const staffMember = await userModel.findOne({
            _id: assignedTo,
            role: "staff",
            createdBy: tenantId,
          });
          if (!staffMember) {
            return res
              .status(400)
              .json({
                message: "Target agent not found in your organization.",
              });
          }
          lead.assignedTo = assignedTo;
        }
      }
    }

    await lead.save();

    const updatedLead = await Lead.findById(leadId)
      .populate("assignedTo", "name email phone")
      .populate("createdBy", "name email role");

    return res.status(200).json({
      message: "Lead updated successfully",
      lead: updatedLead,
    });
  } catch (error) {
    console.error("Error updating lead:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const incomingWebhook = async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ message: "Invalid Tenant ID parameter" });
    }

    const validation = webhookLeadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Invalid webhook payload",
        errors: validation.error.format(),
      });
    }

    const { name, email, phone, source, rawData } = validation.data;

    const plan = await getTenantPlan(tenantId);
    const leadCount = await Lead.countDocuments({ tenantId, isDeleted: false });

    if (plan && plan.leadLimit != null && plan.leadLimit !== 0 && leadCount >= plan.leadLimit) {
      return res.status(403).json({
        message: `Webhook Rejected: Tenant has reached their lead limit (${plan.leadLimit}) on the "${plan.name}" plan.`,
      });
    }

    const staff = await getTenantStaff(tenantId);
    let assignedTo = null;

    if (staff && staff.length > 0) {
      const lastAssignedLead = await Lead.findOne({
        tenantId,
        assignedTo: { $ne: null },
      }).sort({ createdAt: -1 });

      if (lastAssignedLead && lastAssignedLead.assignedTo) {
        const lastAgentIdStr = lastAssignedLead.assignedTo.toString();
        const lastAgentIndex = staff.findIndex(
          (s) => s._id.toString() === lastAgentIdStr,
        );

        if (lastAgentIndex !== -1) {
          const nextAgentIndex = (lastAgentIndex + 1) % staff.length;
          assignedTo = staff[nextAgentIndex]._id;
        } else {
          assignedTo = staff[0]._id;
        }
      } else {
        assignedTo = staff[0]._id;
      }
    }
    const newLead = await Lead.create({
      tenantId,
      name,
      email: email || undefined,
      phone,
      status: "New",
      source,
      assignedTo,
      createdBy: null,
      rawData: rawData || {},
    });

    return res.status(201).json({
      message: "Webhook ingested successfully",
      lead: newLead,
    });
  } catch (error) {
    console.error("Error ingesting lead webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { role, _id: userId } = req.user;
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ message: "Invalid Lead ID" });
    }

    const lead = await Lead.findOne({ _id: leadId, tenantId, isDeleted: false });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Staff can only delete their own assigned leads
    if (role === "staff") {
      if (!lead.assignedTo || lead.assignedTo.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Access Denied: You can only delete leads assigned to you." });
      }
    }

    lead.isDeleted = true;
    await lead.save();

    return res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
