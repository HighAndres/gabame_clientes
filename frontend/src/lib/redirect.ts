import { DOMINIOS_GRUPO, HOSTS_LOCALES } from "@/lib/dominios-grupo";

/** A donde va el usuario cuando el `redirect` no es valido. Nunca se le avisa: se ignora en silencio. */
export const DESTINO_POR_DEFECTO = "/dashboard";

/** Nombre de la cookie que guarda el destino ya validado mientras el usuario verifica su correo. */
export const COOKIE_REDIRECT = "gabame_redirect";
export const COOKIE_REDIRECT_SEGUNDOS = 30 * 60;

function esLocal(): boolean {
  return process.env.NEXT_PUBLIC_ENVIRONMENT !== "production";
}

function hostPermitido(host: string): boolean {
  const h = host.toLowerCase();
  if (esLocal() && HOSTS_LOCALES.includes(h)) return true;
  return DOMINIOS_GRUPO.some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Unica funcion que decide un destino de redireccion. La usan login, registro,
 * verificar-email y el middleware.
 *
 * Acepta:
 *  - rutas internas que empiezan con una sola "/" (no "//", no "/\")
 *  - URLs absolutas https (http solo en local) cuyo host esta en la allowlist del grupo
 * Todo lo demas cae a `/dashboard`.
 */
export function destinoSeguro(valor: string | null | undefined): string {
  if (!valor) return DESTINO_POR_DEFECTO;
  const v = valor.trim();
  if (!v || v.length > 2048) return DESTINO_POR_DEFECTO;

  // Ruta interna
  if (v.startsWith("/")) {
    if (v.startsWith("//") || v.startsWith("/\\")) return DESTINO_POR_DEFECTO;
    // No se vuelve a las pantallas de auth ni a los route handlers
    if (/^\/(login|registro|recuperar|restablecer|verificar-email|api)(\/|\?|$)/.test(v)) {
      return DESTINO_POR_DEFECTO;
    }
    return v;
  }

  // URL absoluta
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    return DESTINO_POR_DEFECTO;
  }
  const esquemaOk = url.protocol === "https:" || (esLocal() && url.protocol === "http:");
  if (!esquemaOk) return DESTINO_POR_DEFECTO;
  if (url.username || url.password) return DESTINO_POR_DEFECTO;
  if (!hostPermitido(url.hostname)) return DESTINO_POR_DEFECTO;
  return url.toString();
}

/** True si el destino sale del portal (vuelve a otra pieza del ecosistema). */
export function esDestinoExterno(destino: string): boolean {
  return !destino.startsWith("/");
}
