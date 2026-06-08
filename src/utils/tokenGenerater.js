import JWT from "jsonwebtoken";

export const tokenGenerater = (user) => {
  const tenantId = user.role === "admin" ? user._id : user.createdBy;

  const accessToken = JWT.sign(
    { _id: user._id, tenantId, role: user.role },
    process.env.access_token_secret,
    {
      expiresIn: "1h",
    }
  );

  const refreshToken = JWT.sign(
    { _id: user._id, tenantId, role: user.role },
    process.env.refresh_token_secret,
    {
      expiresIn: "7d",
    }
  );

  return { accessToken, refreshToken };
};

