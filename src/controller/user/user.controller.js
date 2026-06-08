import { userModel } from "../../models/user.models.js";
import bcrypt from "bcrypt";
import { tokenGenerater } from "../../utils/tokenGenerater.js";
import {
  getTenantStaff,
  invalidateTenantStaff,
  invalidateTenantPlan,
} from "../../utils/cache.js";

export const createUser = async (req, res) => {
  try {
    const { _id } = req.user;
    const { name, email, password, phone, plan, role } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "password is required" });
    }
    if (!phone) {
      return res.status(400).json({ message: "phone is required" });
    }
    if (!role) {
      return res.status(400).json({ message: "role is required" });
    }
    const findUserEmail = await userModel.findOne({ email });
    if (findUserEmail) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }
    const findUserPhone = await userModel.findOne({ phone });
    if (findUserPhone) {
      return res
        .status(400)
        .json({ message: "User with this phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === "staff") {
      const creator = await userModel
        .findById(_id)
        .populate("plan", "name userLimit")
        .select("plan role");

      if (!creator) {
        return res.status(403).json({ message: "Creator not found" });
      }

      const creatorRole = creator.role;
      const creatorPlan = creator.plan?.name?.toLowerCase();

      if (creatorRole === "admin") {
        const userLimit = creator.plan?.userLimit ?? 0;

        if (userLimit !== 0) {
          const staffCount = await userModel.countDocuments({
            role: "staff",
            createdBy: _id,
          });

          if (staffCount >= userLimit) {
            return res.status(403).json({
              message: `This plan allows a maximum of ${userLimit} staff members`,
            });
          }
        }
      }
    }

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      plan: plan || null,
      role,
      createdBy: _id,
      updatedBy: _id,
    });

    if (newUser.role === "staff") {
      invalidateTenantStaff(_id);
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        plan: newUser.plan,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = tokenGenerater(user);

    res.cookie("accessToken", accessToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 24*60*60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          plan: user.plan,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllTenants = async (req, res) => {
  try {
    const tenants = await userModel.find({ role: "admin" }).populate("plan", "name");
    if (tenants.length === 0) {
      return res.status(404).json({ message: "No tenants found" });
    }
    return res
      .status(200)
      .json({ message: "Tenants retrieved successfully", tenants });
  } catch (error) {
    console.error("Error retrieving tenants:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllstaffs = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const staffs = await getTenantStaff(tenantId);
    return res
      .status(200)
      .json({ message: "Staff members retrieved successfully", staffs });
  } catch (error) {
    console.error("Error retrieving staff members:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { _id } = req.params;
    const { name, email, password, phone, plan, role } = req.body;
    const updaterId = req.user?._id;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }
    if (!password) {
      return res.status(400).json({ message: "password is required" });
    }
    if (!phone) {
      return res.status(400).json({ message: "phone is required" });
    }
    if (!role) {
      return res.status(400).json({ message: "role is required" });
    }

    const userToUpdate = await userModel.findById(_id);
    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingEmailUser = await userModel.findOne({
      email,
      _id: { $ne: _id },
    });
    if (existingEmailUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    const existingPhoneUser = await userModel.findOne({
      phone,
      _id: { $ne: _id },
    });
    if (existingPhoneUser) {
      return res
        .status(400)
        .json({ message: "User with this phone number already exists" });
    }

    if (role === "staff" && updaterId) {
      const creator = await userModel
        .findById(updaterId)
        .populate("plan", "name userLimit")
        .select("plan role");

      if (!creator) {
        return res.status(403).json({
          message: "Please Login",
        });
      }

      if (creator.role === "admin") {
        const userLimit = creator.plan?.userLimit ?? 0;
        if (userLimit !== 0) {
          const staffCount = await userModel.countDocuments({
            role: "staff",
            createdBy: updaterId,
          });

          if (staffCount >= userLimit) {
            return res.status(403).json({
              message: `Maximum ${userLimit} staff members allowed for your plan`,
            });
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await userModel.findByIdAndUpdate(
      _id,
      {
        name,
        email,
        password: hashedPassword,
        phone,
        plan: plan || null,
        role,
        updatedBy: updaterId,
      },
      { new: true },
    );

    if (updatedUser) {
      if (updatedUser.role === "staff" && updatedUser.createdBy) {
        invalidateTenantStaff(updatedUser.createdBy.toString());
      } else if (updatedUser.role === "admin") {
        invalidateTenantPlan(updatedUser._id.toString());
        invalidateTenantStaff(updatedUser._id.toString());
      }
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        plan: updatedUser.plan,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "User Update Failed" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { _id } = req.params;
    const userToDelete = await userModel.findById(_id);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found" });
    }
    await userModel.findByIdAndDelete(_id);

    if (userToDelete.role === "staff" && userToDelete.createdBy) {
      invalidateTenantStaff(userToDelete.createdBy.toString());
    } else if (userToDelete.role === "admin") {
      invalidateTenantPlan(userToDelete._id.toString());
      invalidateTenantStaff(userToDelete._id.toString());
    }

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "User Deletion Failed" });
  }
};

export const signupUser = async (req, res) => {
  try {
    const { name, email, password, phone, plan } = req.body;

    if (!name) return res.status(400).json({ message: "name is required" });
    if (!email) return res.status(400).json({ message: "email is required" });
    if (!password)
      return res.status(400).json({ message: "password is required" });
    if (!phone) return res.status(400).json({ message: "phone is required" });

    const findUserEmail = await userModel.findOne({ email });
    if (findUserEmail) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }
    const findUserPhone = await userModel.findOne({ phone });
    if (findUserPhone) {
      return res
        .status(400)
        .json({ message: "User with this phone number already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      phone,
      plan: plan || "basic",
      role: "admin",
    });

    newUser.createdBy = newUser._id;
    newUser.updatedBy = newUser._id;
    await newUser.save();

    return res.status(201).json({
      message: "Admin registered successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        plan: newUser.plan,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error signing up admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
