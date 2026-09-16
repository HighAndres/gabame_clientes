import { interpretarDetalle } from "@/lib/api";
import { prepararPeticion } from "@/lib/metodo";

/**
 * Llamadas del navegador a los route handlers del portal (`/api/backend/*`, `/api/sesion`,
 * `/api/perfil`). Todo componente cliente pasa por aqui, por dos razones:
 *
 * - PUT, PATCH y DELETE viajan como POST con el metodo en una cabecera (ver `lib/metodo.ts`);
 *   con `fetch` directo no pasan el firewall del servidor del portal.
 * - El error se lee igual en todas partes, incluidos los 422 de validacion.
 */
export function enviar(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, prepararPeticion(init));
}

/** Atajo para cuerpos JSON. */
export function enviarJson(url: string, method: string, cuerpo?: unknown): Promise<Response> {
  return enviar(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
}

/** El mensaje que se le muestra a la persona cuando la respuesta no fue exitosa. */
export async function mensajeDeError(res: Response, porDefecto = "No se pudo guardar."): Promise<string> {
  const cuerpo = await res.json().catch(() => null);
  if (!cuerpo) return porDefecto;
  const error = interpretarDetalle(res.status, cuerpo);
  return error.codigo === "error" ? porDefecto : error.message;
}
