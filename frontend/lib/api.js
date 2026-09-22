const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("chh_token");
}

export function setToken(token) {
  if (typeof window !== "undefined") localStorage.setItem("chh_token", token);
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("chh_token");
}

export async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch (e) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export { API_BASE, getToken };
