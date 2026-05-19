const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_KEY = "onix_token";
export const USER_KEY = "onix_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const s = localStorage.getItem(USER_KEY);
  return s ? JSON.parse(s) : null;
}

export function setStoredUser(u: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(u));
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sessiya tugadi");
  }
  if (!res.ok) {
    const text = await res.text();
    let detail = text;
    try { detail = JSON.parse(text).detail || text; } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ============ Types ============

export type User = {
  id: number;
  username: string;
  full_name: string | null;
  role: "admin" | "manager";
  is_active: boolean;
  created_at: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Account = {
  id: number;
  user_id: number;
  phone: string;
  session_name: string;
  display_name: string | null;
  notes: string | null;
  is_authorized: boolean;
  is_active: boolean;
  created_at: string;
};

export type LookupLocation = {
  display_name: string;
  lat: number;
  lng: number;
  type: string | null;
};

export type LookupResult = {
  kind: "group" | "invite_preview";
  tg_id: number | null;
  title: string;
  username: string | null;
  members_count: number;
  online_count?: number;
  is_megagroup: boolean;
  is_broadcast: boolean;
  photo_present?: boolean;
  about: string | null;
  district: string | null;
  address_hints: string[];
  location: LookupLocation | null;
  join_required: boolean;
  invite_hash?: string;
  account_used?: { id: number; phone: string; display_name: string | null };
};

export type Group = {
  id: number;
  user_id: number;
  tg_id: number;
  title: string;
  username: string | null;
  invite_link: string | null;
  about: string | null;
  members_count: number;
  online_count: number;
  is_megagroup: boolean;
  is_broadcast: boolean;
  auto_district: string | null;
  auto_address_hints: string | null;
  auto_lat: number | null;
  auto_lng: number | null;
  manual_address: string | null;
  manual_lat: number | null;
  manual_lng: number | null;
  notes: string | null;
  last_sync_at: string | null;
  saved_at: string;
};

export type AdminUserSummary = User & {
  accounts_count: number;
  groups_count: number;
  groups_with_location: number;
};
