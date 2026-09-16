/**
 * Que cabeceras del backend se reenvian al navegador desde /api/backend/*.
 *
 * `content-length` NO se copia, y es la parte importante: el backend puede responder comprimido
 * (Caddy usa brotli), y `fetch` entrega el cuerpo YA descomprimido pero conserva la cabecera con
 * el tamano comprimido. Copiarla recorta la respuesta a ese tamano y el JSON llega partido.
 * Medido en el portal: 337 bytes de cuerpo real anunciados como 227. El runtime calcula sola la
 * longitud correcta, asi que basta con no ponerla.
 *
 * `content-encoding` tampoco se copia, por lo mismo: el cuerpo que sale de aqui ya viene
 * descomprimido, y anunciarlo como comprimido haria que el navegador intente descomprimir texto.
 */
const REENVIADAS = ["content-type", "content-disposition", "cache-control"] as const;

export function cabecerasDeSalida(origen: Headers): Headers {
  const salida = new Headers();
  for (const nombre of REENVIADAS) {
    const valor = origen.get(nombre);
    if (valor) salida.set(nombre, valor);
  }
  return salida;
}

/**
 * Ruta del backend a partir de los segmentos de /api/backend/*, o null si no es aceptable.
 *
 * Un segmento "." o ".." (que llega asi aunque se mande como %2e%2e) haria que la URL final se
 * normalice fuera de /api/v1 y el proxy alcanzara, con el token de la persona, rutas del backend
 * que no son la API. Se rechaza en vez de limpiarse: ninguna ruta legitima los usa.
 */
export function rutaBackend(segmentos: string[]): string | null {
  if (segmentos.length === 0) return null;
  if (segmentos.some((s) => s === "" || s === "." || s === "..")) return null;
  return segmentos.map(encodeURIComponent).join("/");
}
