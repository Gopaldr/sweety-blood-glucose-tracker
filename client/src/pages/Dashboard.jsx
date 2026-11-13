
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readingsAPI } from "../services/api";
import Reports from "./Reports";

const TIME_SLOTS = [
    "Morning (fasting)",
    "After breakfast",
    "After lunch",
    "After dinner"
];

function getToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function Dashboard() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const [readings, setReadings] = useState([]);
    const [selectedDate, setSelectedDate] = useState(getToday());

    const [form, setForm] = useState({
        reading_date: getToday(),
        time_slot: TIME_SLOTS[0],
        glucose_value: ""
    });

    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadReadings();
    }, [selectedDate]);

    async function loadReadings() {
        try {
            setLoading(true);
            setError("");

            const response = await readingsAPI.getAll(selectedDate);
            setReadings(response.data.readings || []);
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to load glucose readings."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleChange(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const value = Number(form.glucose_value);

        if (!form.glucose_value) {
            setError("Please enter a glucose value.");
            return;
        }

        if (!Number.isInteger(value) || value < 40 || value > 600) {
            setError("Value must be between 40 and 600 mg/dl.");
            return;
        }

        try {
            setLoading(true);

            const data = {
                reading_date: form.reading_date,
                time_slot: form.time_slot,
                glucose_value: value
            };

            if (editingId) {
                await readingsAPI.update(editingId, data);
                setSuccess("Glucose reading updated successfully.");
            } else {
                await readingsAPI.create(data);
                setSuccess("Glucose reading added successfully.");
            }

            setEditingId(null);
            setForm({
                reading_date: getToday(),
                time_slot: TIME_SLOTS[0],
                glucose_value: ""
            });

            // Refresh the currently selected date.
            const response = await readingsAPI.getAll(selectedDate);
            setReadings(response.data.readings || []);
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to save glucose reading."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleEdit(reading) {
        setEditingId(reading.id);

        setForm({
            reading_date: String(reading.reading_date).slice(0, 10),
            time_slot: reading.time_slot,
            glucose_value: String(reading.glucose_value)
        });

        setError("");
        setSuccess("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function cancelEdit() {
        setEditingId(null);

        setForm({
            reading_date: getToday(),
            time_slot: TIME_SLOTS[0],
            glucose_value: ""
        });

        setError("");
        setSuccess("");
    }

    async function handleDelete(id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this glucose reading?"
        );

        if (!confirmed) return;

        setError("");
        setSuccess("");

        try {
            setLoading(true);

            await readingsAPI.delete(id);

            setSuccess("Glucose reading deleted successfully.");

            const response = await readingsAPI.getAll(selectedDate);
            setReadings(response.data.readings || []);
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to delete glucose reading."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    }

    const average = readings.length
        ? (
            readings.reduce(
                (total, reading) => total + Number(reading.glucose_value),
                0
            ) / readings.length
        ).toFixed(1)
        : "—";

    const highest = readings.length
        ? Math.max(...readings.map((reading) => Number(reading.glucose_value)))
        : "—";

    const lowest = readings.length
        ? Math.min(...readings.map((reading) => Number(reading.glucose_value)))
        : "—";

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h1>Sweety</h1>
                    <p>Blood Glucose Tracker</p>
                </div>

                <div className="user-section">
                    <span>Welcome, {user.name || "User"}</span>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <section className="dashboard-intro">
                <h2>Your Glucose Dashboard</h2>
                <p>Track and manage your daily blood glucose readings.</p>
            </section>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <section className="reading-form-section">
                <h2>{editingId ? "Edit Reading" : "Add Glucose Reading"}</h2>

                <form className="reading-form" onSubmit={handleSubmit}>
                    <div>
                        <label>Reading Date</label>
                        <input
                            type="date"
                            name="reading_date"
                            value={form.reading_date}
                            onChange={handleChange}
                            max={getToday()}
                            required
                        />
                    </div>

                    <div>
                        <label>Time Slot</label>
                        <select
                            name="time_slot"
                            value={form.time_slot}
                            onChange={handleChange}
                            required
                        >
                            {TIME_SLOTS.map((slot) => (
                                <option key={slot} value={slot}>
                                    {slot}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Glucose Value (mg/dl)</label>
                        <input
                            type="number"
                            name="glucose_value"
                            value={form.glucose_value}
                            onChange={handleChange}
                            placeholder="Enter value"
                            min="40"
                            max="600"
                            step="1"
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button type="submit" disabled={loading}>
                            {loading
                                ? "Please wait..."
                                : editingId
                                    ? "Update Reading"
                                    : "Add Reading"}
                        </button>

                        {editingId && (
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={cancelEdit}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </section>

            <section className="summary-section">
                <h2>Daily Summary</h2>

                <div className="summary-grid">
                    <div className="summary-card">
                        <span>Highest</span>
                        <h3>{highest}</h3>
                        <small>mg/dl</small>
                    </div>

                    <div className="summary-card">
                        <span>Lowest</span>
                        <h3>{lowest}</h3>
                        <small>mg/dl</small>
                    </div>

                    <div className="summary-card">
                        <span>Average</span>
                        <h3>{average}</h3>
                        <small>mg/dl</small>
                    </div>

                    <div className="summary-card">
                        <span>Total Readings</span>
                        <h3>{readings.length}</h3>
                        <small>readings</small>
                    </div>
                </div>
            </section>

            <section className="readings-section">
                <div className="readings-heading">
                    <h2>Glucose Readings</h2>

                    <div>
                        <label>View Date: </label>
                        <input
                            type="date"
                            value={selectedDate}
                            max={getToday()}
                            onChange={(event) => setSelectedDate(event.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <p>Loading readings...</p>
                ) : readings.length === 0 ? (
                    <div className="empty-state">
                        <h3>No readings found</h3>
                        <p>Add a glucose reading to start tracking your health.</p>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Time Slot</th>
                                    <th>Glucose (mg/dl)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {readings.map((reading) => (
                                    <tr key={reading.id}>
                                        <td>{String(reading.reading_date).slice(0, 10)}</td>
                                        <td>{reading.time_slot}</td>
                                        <td>{reading.glucose_value}</td>
                                        <td className="action-buttons">
                                            <button
                                                onClick={() => handleEdit(reading)}
                                                className="edit-button"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                onClick={() => handleDelete(reading.id)}
                                                className="delete-button"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
<Reports />
        </div>
    );
}

export default Dashboard;
