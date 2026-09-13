const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const TOKEN_KEY = "agribalance_auth_token";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "API request failed");
    error.status = response.status;
    error.code = body.error;
    throw error;
  }
  return body;
}
const json = (method, body) => ({ method, body: JSON.stringify(body) });
export const authApi = {
  register: (body) => request("/auth/register", json("POST", body)),
  login: (body) => request("/auth/login", json("POST", body)),
  me: () => request("/auth/me"),
};
export const farmerApi = {
  list: (query = "") => request(`/farmers${query ? `?${query}` : ""}`),
  get: (id) => request(`/farmers/${id}`),
  history: (id) => request(`/farmers/${id}/surveys`),
};
export const surveyApi = {
  create: (body) => request("/surveys", json("POST", body)),
  list: (query = "") => request(`/surveys${query ? `?${query}` : ""}`),
  get: (id) => request(`/surveys/${id}`),
  update: (id, body) => request(`/surveys/${id}`, json("PUT", body)),
  remove: (id) => request(`/surveys/${id}`, { method: "DELETE" }),
};
export const dashboardApi = { summary: () => request("/dashboard/summary") };
export const villageApi = {
  list: () => request("/villages"),
  get: (name) => request(`/villages/${encodeURIComponent(name)}`),
  compare: () => request("/villages/compare"),
};
export const followUpApi = {
  list: () => request("/followups"),
  create: (body) => request("/followups", json("POST", body)),
  update: (id, body) => request(`/followups/${id}`, json("PUT", body)),
};
export const authStorage = {
  tokenKey: TOKEN_KEY,
  save: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};
