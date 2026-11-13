
import { useState } from "react";
import { reportsAPI } from "../services/api";

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function Reports() {
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [reportType, setReportType] = useState("daily");
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function loadReport(type = reportType, date = selectedDate) {
        setLoading(true);
        setError("");
        setReport(null);

        try {
            let response;

            if (type === "daily") {
                response = await reportsAPI.daily(date);
            } else if (type === "month-to-date") {
                response = await reportsAPI.monthToDate(date);
            } else {
                response = await reportsAPI.monthly(date);
            }

            setReport(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to generate the report."
            );
        } finally {
            setLoading(false);
        }
    }

    function changeReportType(type) {
        setReportType(type);
        loadReport(type, selectedDate);
    }

    function handleDateChange(event) {
        const date = event.target.value;
        setSelectedDate(date);
        loadReport(reportType, date);
    }

    const summary = report?.summary || {};
    const readings = report?.readings || [];
    const dailyBreakdown = report?.daily_breakdown || [];
    const period = report?.period;

    function formatValue(value) {
        return value === null || value === undefined ? "—" : value;
    }

    return (
        <section className="reports-section">
            <h2>Glucose Reports</h2>
            <p className="reports-description">
                Review your glucose readings over different periods.
            </p>

            <div className="report-controls">
                <div>
                    <label>Report Date</label>
                    <input
                        type="date"
                        value={selectedDate}
                        max={getToday()}
                        onChange={handleDateChange}
                    />
                </div>

                <div className="report-tabs">
                    <button
                        className={reportType === "daily" ? "active-tab" : ""}
                        onClick={() => changeReportType("daily")}
                    >
                        Daily
                    </button>

                    <button
                        className={reportType === "month-to-date" ? "active-tab" : ""}
                        onClick={() => changeReportType("month-to-date")}
                    >
                        Month-to-Date
                    </button>

                    <button
                        className={reportType === "monthly" ? "active-tab" : ""}
                        onClick={() => changeReportType("monthly")}
                    >
                        Previous Month
                    </button>
                </div>

                <button onClick={() => loadReport()} disabled={loading}>
                    {loading ? "Generating..." : "Generate Report"}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {!report && !loading && !error && (
                <div className="empty-state">
                    <p>Select a report type and generate your report.</p>
                </div>
            )}

            {loading && <p className="report-loading">Generating report...</p>}

            {report && !loading && (
                <>
                    <div className="report-period">
                        <h3>{report.report || "Glucose Report"}</h3>

                        {period && (
                            <p>
                                Period:{" "}
                                {typeof period === "string"
                                    ? period
                                    : `${period.start_date || period.start || ""} ${
                                        period.end_date || period.end || ""
                                    }`}
                            </p>
                        )}

                        {report.message && <p>{report.message}</p>}
                    </div>

                    <div className="summary-grid report-summary-grid">
                        <div className="summary-card">
                            <span>Highest</span>
                            <h3>{formatValue(summary.highest)}</h3>
                            <small>mg/dl</small>
                        </div>

                        <div className="summary-card">
                            <span>Lowest</span>
                            <h3>{formatValue(summary.lowest)}</h3>
                            <small>mg/dl</small>
                        </div>

                        <div className="summary-card">
                            <span>Average</span>
                            <h3>{formatValue(summary.average)}</h3>
                            <small>mg/dl</small>
                        </div>

                        <div className="summary-card">
                            <span>Total Readings</span>
                            <h3>{formatValue(summary.count ?? 0)}</h3>
                            <small>readings</small>
                        </div>
                    </div>

                    {reportType === "daily" && (
                        <div className="report-details">
                            <h3>Daily Reading Details</h3>

                            {readings.length === 0 ? (
                                <div className="empty-state">
                                    No glucose readings found for this date.
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Time Slot</th>
                                                <th>Glucose (mg/dl)</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {readings.map((reading) => (
                                                <tr key={reading.id}>
                                                    <td>
                                                        {String(reading.reading_date).slice(0, 10)}
                                                    </td>
                                                    <td>{reading.time_slot}</td>
                                                    <td>{reading.glucose_value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {(reportType === "month-to-date" ||
                        reportType === "monthly") && (
                        <div className="report-details">
                            <h3>Daily Breakdown</h3>

                            {dailyBreakdown.length === 0 ? (
                                <div className="empty-state">
                                    No readings found during this report period.
                                </div>
                            ) : (
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Highest</th>
                                                <th>Lowest</th>
                                                <th>Average</th>
                                                <th>Readings</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {dailyBreakdown.map((day, index) => (
                                                <tr key={day.reading_date || day.date || index}>
                                                    <td>
                                                        {String(
                                                            day.reading_date || day.date || ""
                                                        ).slice(0, 10)}
                                                    </td>
                                                    <td>{formatValue(day.highest)}</td>
                                                    <td>{formatValue(day.lowest)}</td>
                                                    <td>{formatValue(day.average)}</td>
                                                    <td>{formatValue(day.count ?? 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default Reports;
