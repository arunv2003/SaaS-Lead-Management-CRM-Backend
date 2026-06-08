import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { connectDB } from "./db.js";

import userRoutes from "./src/routes/user/user.route.js";
import leadRoutes from "./src/routes/leads/lead.route.js";
import plansRoutes from "./src/routes/plans/plans.route.js";

dotenv.config();
connectDB();
const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 9000;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/v1/users", userRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/plans", plansRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
