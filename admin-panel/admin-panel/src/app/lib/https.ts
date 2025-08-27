// lib/http.ts
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

export async function fetchJson<T = any>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new Error("NEXT_PUBLIC_API_BASE is not set");
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, init);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!ct.includes("application/json")) {
    throw new Error(`Expected JSON, got "${ct}". First 120 chars: ${text.slice(0, 120)}`);
  }

  const data = JSON.parse(text);
  if (!res.ok) {
    throw new Error((data && (data.detail || data.message)) || `HTTP ${res.status}`);
  }
  return data;
}
