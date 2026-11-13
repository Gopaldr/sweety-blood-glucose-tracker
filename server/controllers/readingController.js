
const pool = require("../config/db");

const VALID_SLOTS = [
    "Morning (fasting)",
    "After breakfast",
    "After lunch",
    "After dinner"
];

// Get today's date in Indian Standard Time
function getToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const values = {};
    for (const part of parts) {
        values[part.type] = part.value;
    }

    return `${values.year}-${values.month}-${values.day}`;
}

// Validate YYYY-MM-DD without timezone conversion
function isValidDate(date) {
    if (typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));

    return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
    );
}

function validateReadingDate(date) {
    if (!isValidDate(date)) {
        return "Please enter a valid date.";
    }

    if (date > getToday()) {
        return "Date cannot be in the future.";
    }

    return null;
}

function validateGlucoseValue(value) {
    if (value === undefined || value === null || value === "") {
        return "Please enter a glucose value.";
    }

    if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 40 ||
        value > 600
    ) {
        return "Value must be between 40 and 600 mg/dl.";
    }

    return null;
}

function validateTimeSlot(slot) {
    if (!VALID_SLOTS.includes(slot)) {
        return "Please select a valid time slot.";
    }

    return null;
}

// CREATE READING
async function createReading(req, res) {
    const { reading_date, time_slot, glucose_value } = req.body;
    const userId = req.user.id;

    const dateError = validateReadingDate(reading_date);
    if (dateError) {
        return res.status(400).json({ message: dateError });
    }

    const valueError = validateGlucoseValue(glucose_value);
    if (valueError) {
        return res.status(400).json({ message: valueError });
    }

    const slotError = validateTimeSlot(time_slot);
    if (slotError) {
        return res.status(400).json({ message: slotError });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock the user row to prevent concurrent daily inserts
        await client.query(
            "SELECT id FROM users WHERE id = $1 FOR UPDATE",
            [userId]
        );

        const countResult = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM readings
             WHERE user_id = $1 AND reading_date = $2`,
            [userId, reading_date]
        );

        if (countResult.rows[0].count >= 4) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "You can add only 4 readings per day."
            });
        }

        const duplicateResult = await client.query(
            `SELECT id
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             AND time_slot = $3`,
            [userId, reading_date, time_slot]
        );

        if (duplicateResult.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: `You already have a ${time_slot} reading for this date.`
            });
        }

        const result = await client.query(
            `INSERT INTO readings
                (user_id, reading_date, time_slot, glucose_value)
             VALUES ($1, $2, $3, $4)
             RETURNING
                id,
                user_id,
                TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                time_slot,
                glucose_value,
                created_at,
                updated_at`,
            [userId, reading_date, time_slot, glucose_value]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Glucose reading added successfully.",
            reading: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Create reading error:", error.message);

        return res.status(500).json({
            message: "Failed to add glucose reading."
        });
    } finally {
        client.release();
    }
}

// GET ALL READINGS
async function getReadings(req, res) {
    const userId = req.user.id;
    const { date } = req.query;

    if (date && !isValidDate(date)) {
        return res.status(400).json({
            message: "Please enter a valid date."
        });
    }

    try {
        let query = `
            SELECT
                id,
                TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                time_slot,
                glucose_value,
                created_at,
                updated_at
            FROM readings
            WHERE user_id = $1
        `;

        const params = [userId];

        if (date) {
            query += " AND reading_date = $2";
            params.push(date);
        }

        query += `
            ORDER BY reading_date DESC,
            CASE time_slot
                WHEN 'Morning (fasting)' THEN 1
                WHEN 'After breakfast' THEN 2
                WHEN 'After lunch' THEN 3
                WHEN 'After dinner' THEN 4
            END ASC
        `;

        const result = await pool.query(query, params);

        return res.status(200).json({
            count: result.rows.length,
            readings: result.rows
        });

    } catch (error) {
        console.error("Get readings error:", error.message);

        return res.status(500).json({
            message: "Failed to retrieve glucose readings."
        });
    }
}

// UPDATE READING
async function updateReading(req, res) {
    const { id } = req.params;
    const { reading_date, time_slot, glucose_value } = req.body;
    const userId = req.user.id;

    const readingId = Number(id);

    if (!Number.isInteger(readingId) || readingId <= 0) {
        return res.status(400).json({
            message: "Invalid reading ID."
        });
    }

    const dateError = validateReadingDate(reading_date);
    if (dateError) {
        return res.status(400).json({ message: dateError });
    }

    const valueError = validateGlucoseValue(glucose_value);
    if (valueError) {
        return res.status(400).json({ message: valueError });
    }

    const slotError = validateTimeSlot(time_slot);
    if (slotError) {
        return res.status(400).json({ message: slotError });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            "SELECT id FROM users WHERE id = $1 FOR UPDATE",
            [userId]
        );

        const existingResult = await client.query(
            `SELECT id
             FROM readings
             WHERE id = $1 AND user_id = $2`,
            [readingId, userId]
        );

        if (existingResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Glucose reading not found."
            });
        }

        const countResult = await client.query(
            `SELECT COUNT(*)::int AS count
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             AND id <> $3`,
            [userId, reading_date, readingId]
        );

        if (countResult.rows[0].count >= 4) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "You can add only 4 readings per day."
            });
        }

        const duplicateResult = await client.query(
            `SELECT id
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             AND time_slot = $3
             AND id <> $4`,
            [userId, reading_date, time_slot, readingId]
        );

        if (duplicateResult.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: `You already have a ${time_slot} reading for this date.`
            });
        }

        const result = await client.query(
            `UPDATE readings
             SET reading_date = $1,
                 time_slot = $2,
                 glucose_value = $3,
                 updated_at = NOW()
             WHERE id = $4 AND user_id = $5
             RETURNING
                id,
                user_id,
                TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                time_slot,
                glucose_value,
                created_at,
                updated_at`,
            [reading_date, time_slot, glucose_value, readingId, userId]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Glucose reading updated successfully.",
            reading: result.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Update reading error:", error.message);

        return res.status(500).json({
            message: "Failed to update glucose reading."
        });
    } finally {
        client.release();
    }
}

// DELETE READING
async function deleteReading(req, res) {
    const { id } = req.params;
    const readingId = Number(id);
    const userId = req.user.id;

    if (!Number.isInteger(readingId) || readingId <= 0) {
        return res.status(400).json({
            message: "Invalid reading ID."
        });
    }

    try {
        const result = await pool.query(
            `DELETE FROM readings
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [readingId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Glucose reading not found."
            });
        }

        return res.status(200).json({
            message: "Glucose reading deleted successfully."
        });

    } catch (error) {
        console.error("Delete reading error:", error.message);

        return res.status(500).json({
            message: "Failed to delete glucose reading."
        });
    }
}

module.exports = {
    createReading,
    getReadings,
    updateReading,
    deleteReading
};
