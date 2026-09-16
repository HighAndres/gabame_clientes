/**
 * Adonde llamar al backend.
 *
 * En el navegador, por el dominio publico (`NEXT_PUBLIC_API_URL`). En el servidor de Next, por
 * la red interna (`API_URL_INTERNA`, p. ej. http://backend:8000): si no, cada llamada de un
 * route handler o del middleware sale a internet y vuelve a entrar por el servidor web y su
 * firewall, que bloquea PUT/PATCH/DELETE y comprime las respuestas por su cuenta.
 *
 * `API_URL_INTERNA` no lleva prefijo NEXT_PUBLIC a proposito: no debe llegar al navegador.
 */
const PUBLICA = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function urlBackend(): string {
  if (typeof window === "undefined") return process.env.API_URL_INTERNA ?? PUBLICA;
  return PUBLICA;
}
