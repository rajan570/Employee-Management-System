import axios from "axios";

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const LIVE_BACKEND_URL = "https://employee-management-system-three-beta.vercel.app";

const api = axios.create({
    baseURL: (isLocalhost ? "http://localhost:4000" : LIVE_BACKEND_URL) + "/api"
})

// Attach Auth token to all network requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

export default api