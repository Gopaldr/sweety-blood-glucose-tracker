
require("dotenv").config();

const bcrypt = require("bcrypt");
const pool = require("../config/db");

function getLocalDate(daysAgo = 0) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

async function seedDatabase() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const demoName = "Sweety Demo User";
        const demoEmail = "demo@sweety.com";
        const demoPassword = "SweetyDemo@123";

        const passwordHash = await bcrypt.hash(demoPassword, 12);

        const userResult = await client.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             ON CONFLICT (email)
             DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash
             RETURNING id`,
            [demoName, demoEmail, passwordHash]
        );

        const userId = userResult.rows[0].id;

        const sampleReadings = [
            [getLocalDate(0), "Morning (fasting)", 95],
            [getLocalDate(0), "After breakfast", 130],
            [getLocalDate(0), "After lunch", 145],
            [getLocalDate(0), "After dinner", 125],
            [getLocalDate(1), "Morning (fasting)", 98],
            [getLocalDate(1), "After breakfast", 135],
            [getLocalDate(1), "After lunch", 142]
        ];

        for (const [date, slot, value] of sampleReadings) {
            await client.query(
                `INSERT INTO readings
                    (user_id, reading_date, time_slot, glucose_value)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, reading_date, time_slot)
                 DO NOTHING`,
                [userId, date, slot, value]
            );
        }

        await client.query("COMMIT");

        console.log("Demo data created successfully!");
        console.log("----------------------------------");
        console.log("Demo email:", demoEmail);
        console.log("Demo password:", demoPassword);
        console.log("Sample readings:", sampleReadings.length);
        console.log("----------------------------------");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Seed failed:", error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seedDatabase();
