import { urlBackend } from "@/lib/backend-url";
import type { DetalleError } from "@/types/auth";

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

/** Nombre legible de un campo que viene en un error de validacion. */
const CAMPOS: Record<string, string> = {
  email: "Correo",
  password: "Contraseña",
  nombre: "Nombre",
  apellidos: "Apellidos",
  telefono: "Teléfono",
  cedula_profesional: "Cédula profesional",
  especialidad: "Especialidad",
  institucion: "Institución",
  razon_social: "Razón social",
  rfc: "RFC",
  titulo: "Título",
  resumen: "Resumen",
  contenido: "Contenido",
  url_externa: "Enlace",
  vigencia_hasta: "Vigente hasta",
  motivo: "Motivo",
};

type ErrorValidacion = { type?: string; msg?: string; loc?: (string | number)[]; ctx?: Record<string, unknown> };

/** Un error de validacion de Pydantic, dicho en español. Lo que no se reconoce conserva su texto. */
function textoValidacion(e: ErrorValidacion): string {
  const n = e.ctx?.min_length ?? e.ctx?.max_length;
  switch (e.type) {
    case "missing":
      return "es obligatorio";
    case "string_too_short":
      return `debe tener al menos ${n} caracteres`;
    case "string_too_long":
      return `admite como máximo ${n} caracteres`;
    case "date_from_datetime_parsing":
    case "date_parsing":
      return "no es una fecha válida";
    default:
      return (e.msg ?? "no es válido").replace(/^Value error, /, "");
  }
}

/**
 * Convierte la respuesta de error del backend en un ApiError. Exportada porque los formularios
 * que llaman al proxy desde el navegador la necesitan igual: sin ella, un 422 de validacion
 * (que trae una lista, no `{codigo, mensaje}`) se mostraba como "No se pudo guardar." sin decir por que.
 */
export function interpretarDetalle(status: number, cuerpo: unknown): ApiError {
  const detail = (cuerpo as { detail?: unknown } | null)?.detail;
  if (detail && typeof detail === "object" && !Array.isArray(detail) && "codigo" in detail) {
    const d = detail as DetalleError;
    return new ApiError(status, d.codigo, d.mensaje);
  }
  if (Array.isArray(detail) && detail.length > 0) {
    // 422 de Pydantic: se muestra el primer error, en el lenguaje de quien llena el formulario
    const primero = detail[0] as ErrorValidacion;
    const clave = primero.loc?.filter((x): x is string => typeof x === "string" && x !== "body").pop();
    const campo = clave ? (CAMPOS[clave] ?? clave.replace(/_/g, " ")) : null;
    const texto = textoValidacion(primero);
    return new ApiError(status, "datos_invalidos", campo ? `${campo}: ${texto}.` : `${texto}.`);
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
    res = await fetch(`${urlBackend()}/api/v1${path}`, { ...resto, headers, cache: "no-store" });
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
