
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json"
    }
});

// Attach the login token to protected API requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Authentication APIs
export const authAPI = {
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    getMe: () => api.get("/auth/me")
};

// Glucose reading APIs
export const readingsAPI = {
    getAll: (date) => api.get("/readings", {
        params: date ? { date } : {}
    }),
    create: (data) => api.post("/readings", data),
    update: (id, data) => api.put(`/readings/${id}`, data),
    delete: (id) => api.delete(`/readings/${id}`)
};

// Report APIs
export const reportsAPI = {
    daily: (date) => api.get("/reports/daily", {
        params: { date }
    }),
    monthToDate: (date) => api.get("/reports/month-to-date", {
        params: { date }
    }),
    monthly: (date) => api.get("/reports/monthly", {
        params: { date }
    })
};

export default api;
