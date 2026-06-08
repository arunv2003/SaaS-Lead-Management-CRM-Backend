import JWT from "jsonwebtoken";
import mongoose from "mongoose";

export const verifyToken = (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;

    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = JWT.verify(token, process.env.access_token_secret);

    req.user = decoded;

    if (req.user.role === "super_admin") {
      const targetTenant =
        req.headers["x-tenant-id"] || req.query?.tenantId || req.body?.tenantId;

      if (targetTenant) {
        if (!mongoose.Types.ObjectId.isValid(targetTenant)) {
          return res.status(400).json({
            message: "Invalid Tenant identifier",
          });
        }

        req.tenantId = targetTenant;
      }

      return next();
    }

    if (!req.user.tenantId) {
      return res.status(403).json({
        message: "Access Denied: No Tenant association found in token",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user.tenantId)) {
      return res.status(400).json({
        message: "Access Denied: Invalid Tenant identifier",
      });
    }

    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};
