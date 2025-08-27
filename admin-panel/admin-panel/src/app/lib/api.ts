import axios from "axios";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_BASE) {
  // Helpful warning in the browser console
  // eslint-disable-next-line no-console
  console.warn("NEXT_PUBLIC_API_BASE is not set; defaulting to", BASE);
}

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;


// Simple file download helper
export async function downloadBlob(path: string, filename: string) {
  const res = await api.get(path, { responseType: "blob" }); 
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}