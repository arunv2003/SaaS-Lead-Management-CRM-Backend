import { z } from "zod";
import { PlansModel } from "../../models/plans.js";

const plansSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  leadLimit: z.number().nonnegative("Lead limit cannot be negative"),
  userLimit: z.number().nonnegative("User limit cannot be negative"),
});

export const createPlan = async (req, res) => {
  try {
    const validation = plansSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.format(),
      });
    }

    const planExists = await PlansModel.findOne({ name: req.body.name });
    if (planExists) {
      return res.status(409).json({ message: "Plan already exists" });
    }

    const newPlan = await PlansModel.create(req.body);
    return res.status(201).json({
      message: "Plan created successfully",
      plan: newPlan,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllPlans = async (req, res) => {
  try {
    const plans = await PlansModel.find();
    return res.status(200).json({
      message: "Plans fetched successfully",
      plans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = plansSchema.partial().safeParse(req.body);

    const plan = await PlansModel.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    if (!validation.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.error.format(),
      });
    }

    const updatedPlan = await PlansModel.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    return res.status(200).json({
      message: "Plan updated successfully",
      plan: updatedPlan,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await PlansModel.findById(id);
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }
    await PlansModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};
