import type { DetalleError } from "@/types/auth";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Error del backend con `codigo` estable para decidir en UI sin comparar textos. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ApiError";
  }
}

function interpretarDetalle(status: number, cuerpo: unknown): ApiError {
  const detail = (cuerpo as { detail?: unknown } | null)?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && "codigo" in detail) {
    const d = detail as DetalleError;
    return new ApiError(status, d.codigo, d.mensaje);
  }
  if (Array.isArray(detail) && detail.length > 0) {
    // 422 de Pydantic: se muestra el primer mensaje legible
    const primero = detail[0] as { msg?: string; loc?: (string | number)[] };
    const campo = primero.loc?.filter((x) => typeof x === "string" && x !== "body").join(".");
    const msg = (primero.msg ?? "Datos invalidos").replace(/^Value error, /, "");
    return new ApiError(status, "datos_invalidos", campo ? `${campo}: ${msg}` : msg);
  }
  if (typeof detail === "string") return new ApiError(status, "error", detail);
  return new ApiError(status, "error", `Error ${status}`);
}

/**
 * Cliente HTTP del backend. Sirve en cliente y en servidor.
 * Lanza ApiError en cualquier respuesta no-2xx.
 */
export async function api<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const { token, ...resto } = init ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(resto.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, { ...resto, headers, cache: "no-store" });
  } catch {
    throw new ApiError(0, "sin_conexion", "No se pudo contactar al servidor. Intenta de nuevo.");
  }

  if (res.status === 204) return undefined as T;
  const texto = await res.text();
  let cuerpo: unknown = null;
  if (texto) {
    try {
      cuerpo = JSON.parse(texto);
    } catch {
      cuerpo = null;
    }
  }
  if (!res.ok) throw interpretarDetalle(res.status, cuerpo);
  return cuerpo as T;
}
