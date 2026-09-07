import { getRequestConfig } from "next-intl/server";

/**
 * next-intl sin enrutado por locale (Fase 7: bilingue preparado, v1 solo ES).
 * Para activar /en: agregar `src/messages/en.json`, un middleware de locale y leer aqui el
 * idioma de la cookie o del segmento de ruta. Nada mas cambia.
 */
export const LOCALES = ["es"] as const;
export const LOCALE_POR_DEFECTO = "es";

export default getRequestConfig(async () => {
  const locale = LOCALE_POR_DEFECTO;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "America/Mexico_City",
  };
});
