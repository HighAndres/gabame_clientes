/**
 * Allowlist de destinos de retorno al ecosistema. Solo dominios del grupo.
 *
 * Son datos publicos (no secretos), por eso viven en codigo y no en .env.
 * Se acepta el host exacto o cualquier subdominio (www., tienda., etc.).
 *
 * Pendiente 0.6 — Aurashop no tiene dominio documentado todavia; se agrega cuando llegue.
 */
export const DOMINIOS_GRUPO: readonly string[] = [
  "gabame.com", // gabame.com — sitio ancla
  "medinter.com.mx",
  "ordan.com.mx",
  "a7siete.com",
  "farmaciasgabame.com", // Farmacias GABAME (producto, no empresa; la clave interna sigue siendo tiendagabame)
  // "aurashop.???" — Pendiente 0.6
];

/** Hosts locales permitidos solo fuera de produccion, para probar el retorno en desarrollo. */
export const HOSTS_LOCALES: readonly string[] = ["localhost", "127.0.0.1"];
