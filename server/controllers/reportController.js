
const pool = require("../config/db");

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

// Validate date in YYYY-MM-DD format
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

// Get selected date or default to today
function getSelectedDate(date) {
    const selectedDate = date || getToday();

    if (!isValidDate(selectedDate)) {
        return {
            error: "Please enter a valid date."
        };
    }

    if (selectedDate > getToday()) {
        return {
            error: "Date cannot be in the future."
        };
    }

    return { date: selectedDate };
}

// Calculate previous calendar month
function getPreviousMonthRange(selectedDate) {
    const [year, month] = selectedDate.split("-").map(Number);

    const previousMonthStart = new Date(
        Date.UTC(year, month - 2, 1)
    );

    const previousMonthEnd = new Date(
        Date.UTC(year, month - 1, 0)
    );

    return {
        startDate: previousMonthStart.toISOString().slice(0, 10),
        endDate: previousMonthEnd.toISOString().slice(0, 10)
    };
}

// Get overall statistics for a date range
async function getSummary(userId, startDate, endDate) {
    const result = await pool.query(
        `SELECT
            MAX(glucose_value)::int AS highest,
            MIN(glucose_value)::int AS lowest,
            ROUND(AVG(glucose_value)::numeric, 1) AS average,
            COUNT(*)::int AS count
         FROM readings
         WHERE user_id = $1
         AND reading_date >= $2
         AND reading_date <= $3`,
        [userId, startDate, endDate]
    );

    const row = result.rows[0];

    return {
        highest: row.highest,
        lowest: row.lowest,
        average: row.average === null ? null : Number(row.average),
        count: row.count
    };
}

// Get daily statistics grouped by date
async function getDailyBreakdown(userId, startDate, endDate) {
    const result = await pool.query(
        `SELECT
            TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
            MAX(glucose_value)::int AS highest,
            MIN(glucose_value)::int AS lowest,
            ROUND(AVG(glucose_value)::numeric, 1) AS average,
            COUNT(*)::int AS count
         FROM readings
         WHERE user_id = $1
         AND reading_date >= $2
         AND reading_date <= $3
         GROUP BY reading_date
         ORDER BY reading_date ASC`,
        [userId, startDate, endDate]
    );

    return result.rows.map(row => ({
        reading_date: row.reading_date,
        highest: row.highest,
        lowest: row.lowest,
        average: Number(row.average),
        count: row.count
    }));
}

// DAILY REPORT
async function getDailyReport(req, res) {
    const selected = getSelectedDate(req.query.date);

    if (selected.error) {
        return res.status(400).json({
            message: selected.error
        });
    }

    const selectedDate = selected.date;
    const userId = req.user.id;

    try {
        const readingsResult = await pool.query(
            `SELECT
                id,
                TO_CHAR(reading_date, 'YYYY-MM-DD') AS reading_date,
                time_slot,
                glucose_value,
                created_at,
                updated_at
             FROM readings
             WHERE user_id = $1
             AND reading_date = $2
             ORDER BY
                CASE time_slot
                    WHEN 'Morning (fasting)' THEN 1
                    WHEN 'After breakfast' THEN 2
                    WHEN 'After lunch' THEN 3
                    WHEN 'After dinner' THEN 4
                END ASC`,
            [userId, selectedDate]
        );

        const summary = await getSummary(
            userId,
            selectedDate,
            selectedDate
        );

        const readings = readingsResult.rows;

        return res.status(200).json({
            report: "Daily Report",
            period: {
                start_date: selectedDate,
                end_date: selectedDate
            },
            summary,
            readings,
            message: readings.length === 0
                ? "No readings found for this date. Add a reading to see your daily report."
                : "Daily report generated successfully."
        });

    } catch (error) {
        console.error("Daily report error:", error.message);

        return res.status(500).json({
            message: "Failed to generate daily report."
        });
    }
}

// MONTH-TO-DATE REPORT
async function getMonthToDateReport(req, res) {
    const selected = getSelectedDate(req.query.date);

    if (selected.error) {
        return res.status(400).json({
            message: selected.error
        });
    }

    const selectedDate = selected.date;
    const userId = req.user.id;

    // First day of the selected date's month
    const startDate = `${selectedDate.slice(0, 7)}-01`;

    try {
        const summary = await getSummary(
            userId,
            startDate,
            selectedDate
        );

        const dailyBreakdown = await getDailyBreakdown(
            userId,
            startDate,
            selectedDate
        );

        return res.status(200).json({
            report: "Month-to-Date Report",
            period: {
                start_date: startDate,
                end_date: selectedDate
            },
            summary,
            daily_breakdown: dailyBreakdown,
            message: summary.count === 0
                ? "No readings found for this period."
                : "Month-to-date report generated successfully."
        });

    } catch (error) {
        console.error("Month-to-date report error:", error.message);

        return res.status(500).json({
            message: "Failed to generate month-to-date report."
        });
    }
}

// PREVIOUS MONTH REPORT
async function getMonthlyReport(req, res) {
    const selected = getSelectedDate(req.query.date);

    if (selected.error) {
        return res.status(400).json({
            message: selected.error
        });
    }

    const userId = req.user.id;

    const { startDate, endDate } = getPreviousMonthRange(
        selected.date
    );

    try {
        const summary = await getSummary(
            userId,
            startDate,
            endDate
        );

        const dailyBreakdown = await getDailyBreakdown(
            userId,
            startDate,
            endDate
        );

        return res.status(200).json({
            report: "Monthly Report",
            period: {
                start_date: startDate,
                end_date: endDate
            },
            summary,
            daily_breakdown: dailyBreakdown,
            message: summary.count === 0
                ? "No readings found for the previous month."
                : "Monthly report generated successfully."
        });

    } catch (error) {
        console.error("Monthly report error:", error.message);

        return res.status(500).json({
            message: "Failed to generate monthly report."
        });
    }
}

module.exports = {
    getDailyReport,
    getMonthToDateReport,
    getMonthlyReport
};
