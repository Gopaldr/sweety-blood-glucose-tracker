const reportRoutes = require("./routes/reportRoutes");
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const readingRoutes = require("./routes/readingRoutes");

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
}));

app.use(express.json());

// Welcome route
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to Sweety Blood Glucose Tracker API"
    });
});

// Health check
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW() AS current_time");

        res.status(200).json({
            status: "success",
            message: "Backend and PostgreSQL are connected!",
            databaseTime: result.rows[0].current_time
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Glucose reading routes
app.use("/api/readings", readingRoutes);
// Report routes
app.use("/api/reports", reportRoutes);

module.exports = app;
