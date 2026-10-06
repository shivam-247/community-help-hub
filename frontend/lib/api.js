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
  const controller = new AbortController();
  const slowTimer = typeof window !== "undefined" ? setTimeout(() => window.dispatchEvent(new Event("chh-api-slow")), 10000) : null;
  const timeout = setTimeout(() => controller.abort(), 90000);
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: controller.signal,
    });
  } catch (cause) {
    throw new Error(cause.name === "AbortError" ? "The server is taking too long to respond. Please try again." : "Unable to reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeout);
  }
  if (!res.ok) {
    let detail = "Something went wrong.";
    try {
      const data = await res.json();
      detail = Array.isArray(data.detail) ? data.detail.map((item) => item.msg).join("; ") : data.detail || detail;
    } catch (e) {}
    const error = new Error(detail);
    error.status = res.status;
    if (auth && res.status === 401 && typeof window !== "undefined") {
      clearToken();
      window.dispatchEvent(new Event("chh-auth-expired"));
    }
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export { API_BASE, getToken };
