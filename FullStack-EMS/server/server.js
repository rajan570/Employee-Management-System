import express from "express";
import cors from "cors";
import "dotenv/config";
import multer from "multer";
import connectDB from "./config/db.js";
import authRouter from "./routes/authRoutes.js";
import employeesRouter from "./routes/employeeRoutes.js";
import profileRouter from "./routes/profileRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import leaveRouter from "./routes/leaveRoutes.js";
import payslipRouter from "./routes/payslipsRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import User from "./models/User.js";
import bcrypt from "bcrypt";

import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"

const app = express()
const PORT = process.env.PORT || 4000;


// Middleware
app.use(cors())
app.use(express.json())
app.use(multer().none())

// Routes
app.get("/", (req, res)=> res.send("Server is running"));
app.use("/api/auth", authRouter)
app.use("/api/employees", employeesRouter)
app.use("/api/profile", profileRouter)
app.use("/api/attendance", attendanceRouter)
app.use("/api/leave", leaveRouter)
app.use("/api/payslips", payslipRouter)
app.use("/api/dashboard", dashboardRouter)

app.use("/api/inngest", serve({ client: inngest, functions }));

// TEMPORARY: One-time admin seed route — remove after use
app.get("/api/seed-admin", async (req, res) => {
    try {
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const existing = await User.findOne({ email: ADMIN_EMAIL });
        if (existing) {
            return res.json({ message: "Admin already exists", email: ADMIN_EMAIL, role: existing.role });
        }
        const hashedPassword = await bcrypt.hash("admin123", 10);
        const admin = await User.create({ email: ADMIN_EMAIL, password: hashedPassword, role: "ADMIN" });
        return res.json({ message: "Admin created successfully", email: admin.email });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

await connectDB()
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`))