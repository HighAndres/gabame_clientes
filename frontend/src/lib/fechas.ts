/**
 * Fechas en pantalla, siempre en la zona del grupo.
 *
 * Sin zona explicita, `toLocaleDateString` usa la del proceso: en el servidor del portal es UTC,
 * asi que una solicitud hecha a las 19:00 en Mexico aparecia con fecha del dia siguiente, y la
 * misma fecha podia verse distinta renderizada en el servidor que en el navegador.
 *
 * Dos tipos de dato, dos funciones:
 * - `fecha` / `fechaHora`: un instante (lleva zona, p. ej. `creado_en`). Se convierte a Mexico.
 * - `dia`: una fecha de calendario sin hora (`vigencia_hasta`, "2026-10-05"). NO se convierte:
 *   el 5 de octubre es el 5 de octubre en cualquier zona.
 */
export const ZONA_HORARIA = "America/Mexico_City";

export function fecha(iso: string, opciones: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString("es-MX", { timeZone: ZONA_HORARIA, ...opciones });
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short" });
}

export function dia(ymd: string, opciones: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }): string {
  const [anio, mes, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, d)).toLocaleDateString("es-MX", { timeZone: "UTC", ...opciones });
}
