const COOKIE = process.env.NODE_ENV === "production" ? "__Host-chh-session" : "chh_session";
const MAX_BODY = 6 * 1024 * 1024;

export async function proxyRequest(request, path, ResponseClass, upstreamFetch = fetch) {
  const json = (body, status) => ResponseClass.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (!Array.isArray(path) || path.some((part) => !/^[a-zA-Z0-9_-]+(?:\.png)?$/.test(part)) ||
      !["auth", "posts", "requests", "inbox", "users", "admin", "verification", "uploads"].includes(path[0])) {
    return json({ detail: "Unknown endpoint." }, 404);
  }
  const mutating = !["GET", "HEAD"].includes(request.method);
  const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (mutating && (request.headers.get("origin") !== origin || request.headers.get("x-chh-csrf") !== "1")) {
    return json({ detail: "Invalid request origin." }, 403);
  }
  if (path[0] === "uploads" && (mutating || path.length !== 2 || !/^u[1-9][0-9]*_[a-f0-9]{32}\.png$/.test(path[1]))) {
    return json({ detail: "Unknown image." }, 404);
  }
  const base = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:8000" : "");
  let target;
  try {
    const configured = new URL(base);
    if (!["http:", "https:"].includes(configured.protocol) || configured.username || configured.password || configured.search || configured.hash || configured.pathname !== "/") throw new Error();
    if (process.env.NODE_ENV === "production" && configured.protocol !== "https:") throw new Error();
    // Host comes only from server configuration. Client paths cannot choose a destination.
    target = new URL(path.map(encodeURIComponent).join("/"), configured);
    target.search = new URL(request.url).search;
  } catch {
    return json({ detail: "API server configuration is unavailable." }, 503);
  }
  const headers = new Headers();
  const token = request.cookies.get(COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (request.headers.get("content-type")) headers.set("Content-Type", request.headers.get("content-type"));
  if (process.env.PROXY_SHARED_SECRET) {
    headers.set("X-CHH-Proxy-Secret", process.env.PROXY_SHARED_SECRET);
    // Enable only when the hosting ingress overwrites X-Forwarded-For.
    if (process.env.TRUST_PROXY_CLIENT_IP === "true") {
      headers.set("X-CHH-Client-IP", (request.headers.get("x-forwarded-for") || "").split(",")[0].trim());
    }
  }
  let body;
  if (mutating && request.body) {
    if (Number(request.headers.get("content-length") || 0) > MAX_BODY) return json({ detail: "Request too large." }, 413);
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        return json({ detail: "Request too large." }, 413);
      }
      chunks.push(Buffer.from(value));
    }
    body = Buffer.concat(chunks);
  }
  try {
    const upstream = await upstreamFetch(target, { method: request.method, headers, body,
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(60000) });
    if (upstream.status >= 300 && upstream.status < 400) return json({ detail: "Unexpected API redirect." }, 502);
    if (upstream.status >= 500) return json({ detail: "The API is temporarily unavailable." }, 502);
    const contentType = upstream.headers.get("content-type") || "application/json";
    let data = await upstream.arrayBuffer();
    let newToken;
    if (contentType.includes("application/json")) {
      const payload = JSON.parse(new TextDecoder().decode(data));
      if (upstream.ok && typeof payload.access_token === "string") {
        newToken = payload.access_token;
        delete payload.access_token;
        payload.ok = true;
      }
      data = JSON.stringify(payload);
    }
    const response = new ResponseClass(upstream.status === 204 ? null : data, {
      status: upstream.status, headers: { "Content-Type": contentType, "Cache-Control": "no-store",
        ...(upstream.headers.get("retry-after") ? { "Retry-After": upstream.headers.get("retry-after") } : {}) },
    });
    const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" };
    if (newToken) response.cookies.set(COOKIE, newToken, { ...options, maxAge: 3600 });
    if (path.join("/") === "auth/logout" && (upstream.ok || upstream.status === 401)) response.cookies.set(COOKIE, "", { ...options, maxAge: 0 });
    return response;
  } catch {
    return json({ detail: "Unable to reach the API server." }, 502);
  }
}
