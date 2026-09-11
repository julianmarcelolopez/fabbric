import { supabase } from "./supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Request JSON al backend con el JWT de la sesión. Lanza ApiError si !ok. */
export async function apiJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // Content-Type solo si hay body — Fastify rechaza JSON vacío con 400
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? `Error ${res.status}`
    );
  }
  return data as T;
}

/** Request a los endpoints públicos (sin auth) — los usa la tienda. */
export async function publicJson<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? `Error ${res.status}`
    );
  }
  return data as T;
}

/**
 * Descarga un archivo binario (ej. el PDF de una factura, T25) con el Bearer
 * de la sesión y dispara el guardado en el navegador — mismo patrón que
 * `pwa/src/lib/api.ts`. Reusa el nombre de archivo del `Content-Disposition`
 * del backend si está disponible (requiere `exposedHeaders` en el CORS del
 * backend — ver `backend/src/index.ts`), si no cae a `fallbackFilename`.
 */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const token = await accessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? `Error ${res.status}`);
  }
  const disposition = res.headers.get("content-disposition");
  const match = disposition?.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Upload multipart (imágenes): sin Content-Type manual, el browser arma el boundary. */
export async function apiUpload<T = unknown>(path: string, file: File): Promise<T> {
  const token = await accessToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? "error",
      data?.error?.message ?? `Error ${res.status}`
    );
  }
  return data as T;
}
