const API_BASE = "/api/backend";
export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("chh_token");
}
export async function api(
  path,
  { method = "GET", body, auth = false, pagination = false, signal } = {},
) {
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = multipart ? {} : { "Content-Type": "application/json" };
  if (!["GET", "HEAD"].includes(method)) headers["X-CHH-CSRF"] = "1";
  const controller = new AbortController(),
    cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", cancel, { once: true });
  const slow =
    typeof window !== "undefined"
      ? setTimeout(() => window.dispatchEvent(new Event("chh-api-slow")), 10000)
      : null;
  const timeout = setTimeout(cancel, 90000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "same-origin",
      headers,
      body: body ? (multipart ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
    let data = null;
    if (res.status !== 204) {
      try {
        data = await res.json();
      } catch {
        const error = new Error(
          "The server returned an unexpected response. Please try again.",
        );
        error.status = 502;
        throw error;
      }
    }
    if (!res.ok) {
      let detail =
        typeof data?.detail === "string"
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail
                .slice(0, 5)
                .map((x) => x.msg)
                .join("; ")
            : "Something went wrong. Please try again.";
      const reference = data?.request_id || res.headers.get("x-request-id");
      if (reference && res.status >= 500) detail += ` Reference: ${reference}`;
      const error = new Error(detail);
      error.status = res.status;
      if (auth && res.status === 401 && typeof window !== "undefined") {
        clearToken();
        window.dispatchEvent(new Event("chh-auth-expired"));
      }
      throw error;
    }
    return pagination
      ? { items: data, has_more: res.headers.get("x-has-more") === "true" }
      : data;
  } catch (e) {
    if (e.status) throw e;
    throw new Error(
      e.name === "AbortError"
        ? "The request timed out or was cancelled. Please try again."
        : "Unable to reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(slow);
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}
export { API_BASE };
