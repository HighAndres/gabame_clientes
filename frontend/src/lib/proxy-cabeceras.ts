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
