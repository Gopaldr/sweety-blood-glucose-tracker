
require("dotenv").config();

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Verify PostgreSQL connection
        await pool.query("SELECT 1");

        console.log("PostgreSQL connected successfully!");

        // Start Express server
        app.listen(PORT, () => {
            console.log(`Sweety API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
