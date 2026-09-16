/**
 * Metodos HTTP que viajan dentro de un POST.
 *
 * En el servidor del portal, el firewall de aplicaciones que va delante (regla 911100 de OWASP
 * CRS) solo deja pasar GET, HEAD y POST: un PUT, PATCH o DELETE del navegador muere en el
 * servidor web con un 404 y nunca llega a la app. Asi estuvieron rotos en produccion cerrar
 * sesion, guardar Mi cuenta, la acreditacion y casi todo el panel. No se toca ese servidor
 * (decision del cliente), asi que el navegador manda POST con el metodo real en una cabecera y
 * los route handlers de Next lo reenvian al backend con el metodo correcto por la red interna.
 *
 * Solo se acepta sobre POST y solo para esta lista cerrada: un GET nunca se convierte en DELETE,
 * y un formulario de otro sitio no puede poner cabeceras propias.
 */
export const CABECERA_METODO = "x-metodo";

const TUNELADOS = ["PUT", "PATCH", "DELETE"] as const;
export type MetodoTunelado = (typeof TUNELADOS)[number];

function esTunelado(metodo: string): metodo is MetodoTunelado {
  return (TUNELADOS as readonly string[]).includes(metodo);
}

/** Lado navegador: convierte PUT/PATCH/DELETE en POST con el metodo real en la cabecera. */
export function prepararPeticion(init: RequestInit = {}): RequestInit {
  const metodo = (init.method ?? "GET").toUpperCase();
  if (!esTunelado(metodo)) return init;
  const headers = new Headers(init.headers);
  headers.set(CABECERA_METODO, metodo);
  return { ...init, method: "POST", headers };
}

/** Lado servidor: el metodo que la peticion quiso usar. Nunca eleva algo que no sea POST. */
export function metodoEfectivo(req: { method: string; headers: Headers }): string {
  if (req.method !== "POST") return req.method;
  const pedido = (req.headers.get(CABECERA_METODO) ?? "").toUpperCase();
  return esTunelado(pedido) ? pedido : "POST";
}
