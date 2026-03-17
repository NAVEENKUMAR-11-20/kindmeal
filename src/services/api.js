import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Users ──────────────────────────────────────────────────────────────────
export const createUser = (data) => API.post('/users', data);
export const getUser = (id) => API.get(`/users/${id}`);

// ── Food Posts ─────────────────────────────────────────────────────────────
export const getFoodPosts = (params) => API.get('/food', { params });
export const getFoodPost = (id) => API.get(`/food/${id}`);
export const createFoodPost = (data) => API.post('/food', data);
export const updateFoodStatus = (id, status) => API.patch(`/food/${id}/status`, { status });

// ── Requests ───────────────────────────────────────────────────────────────
export const getRequests = (params) => API.get('/requests', { params });
export const createRequest = (data) => API.post('/requests', data);
export const updateRequest = (id, status) => API.patch(`/requests/${id}`, { status });

export default API;
