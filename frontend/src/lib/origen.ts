import type { OrigenIn, Producto } from "@/types/auth";

/** Espejo del enum Producto del backend. Solo estos valores se mandan al API. */
export const PRODUCTOS: readonly Producto[] = [
  "gabame",
  "medinter",
  "ordan",
  "a7",
  "tiendagabame",
  "aurashop",
  "app_paciente",
  "directo",
];

/** Parametros que las piezas del ecosistema agregan al enlazar al portal. */
export const PARAM_ORIGEN = "origen";
export const PARAM_RUTA = "ruta";
export const PARAM_CAMPANA = "campana";

type Params = { get(nombre: string): string | null };

/**
 * Lee `?origen=&ruta=&campana=` de la URL y devuelve un OrigenIn valido o null.
 * Misma regla que el backend: solo pieza del enum, ruta interna sin query, campana corta.
 * Nada mas se captura (ni IP, ni user agent, ni referrer completo).
 */
export function leerOrigen(params: Params): OrigenIn | null {
  const producto = params.get(PARAM_ORIGEN)?.trim().toLowerCase();
  if (!producto || !PRODUCTOS.includes(producto as Producto)) return null;

  let ruta = params.get(PARAM_RUTA)?.trim() || null;
  if (ruta && (!ruta.startsWith("/") || ruta.startsWith("//") || /[?#\\]/.test(ruta) || ruta.length > 255)) {
    ruta = null;
  }
  const campana = params.get(PARAM_CAMPANA)?.trim().slice(0, 120) || null;

  return { producto: producto as Producto, ruta_entrada: ruta, campana };
}

/** Conserva origen, redirect y la puerta elegida (tipo, empresa) al pasar de puerta a login a registro. */
export function conservarParams(params: Params, extra?: Record<string, string>): string {
  const salida = new URLSearchParams();
  for (const k of [PARAM_ORIGEN, PARAM_RUTA, PARAM_CAMPANA, "redirect", "tipo", "empresa"]) {
    const v = params.get(k);
    if (v) salida.set(k, v);
  }
  for (const [k, v] of Object.entries(extra ?? {})) salida.set(k, v);
  const s = salida.toString();
  return s ? `?${s}` : "";
}
