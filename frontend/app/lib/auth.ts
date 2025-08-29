// app/lib/auth.ts
import * as SecureStore from 'expo-secure-store';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';
const VENDOR_PROFILE = 'vendor_profile';

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS);
}

export async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export async function saveVendorProfile(profile: any) {
  await SecureStore.setItemAsync(VENDOR_PROFILE, JSON.stringify(profile));
}

export async function getVendorProfile<T = any>(): Promise<T | null> {
  const s = await SecureStore.getItemAsync(VENDOR_PROFILE);
  return s ? (JSON.parse(s) as T) : null;
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
  await SecureStore.deleteItemAsync(VENDOR_PROFILE);
}
