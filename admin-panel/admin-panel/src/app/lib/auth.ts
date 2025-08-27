import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode("dummy"); // not used for verify locally; we mainly decode client-side
export type Decoded = { id: string; role: string; type: string; exp?: number };

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

export function decodeJwt(token: string): { role?: string; type?: string; exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}