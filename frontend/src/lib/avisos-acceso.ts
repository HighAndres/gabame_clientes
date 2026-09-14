/**
 * Catalogo cerrado de motivos por los que una guarda devolvio a la persona a otra pantalla.
 *
 * Las guardas redirigen (no muestran una pantalla de error) y agregan `?aviso=<motivo>`; la
 * pantalla de destino explica por que. El texto vive AQUI, nunca en la URL: del navegador solo
 * se acepta una clave de este catalogo y cualquier otra cosa se ignora en silencio. Asi nadie
 * puede hacer que el portal muestre un mensaje arbitrario con un enlace preparado.
 *
 * Cada motivo es espejo de una guarda real (src/middleware.ts y src/lib/guardas.ts): si se agrega
 * una guarda se agrega su motivo, y si se retira una se retira el suyo.
 */
export type MotivoAviso =
  | "solo_medicos"
  | "solo_partners"
  | "solo_panel"
  | "medicos_fuera_de_alcance"
  | "contenido_fuera_de_alcance"
  | "solo_administradores";

export interface TextoAviso {
  titulo: string;
  detalle: string;
}

export const AVISOS_ACCESO: Record<MotivoAviso, TextoAviso> = {
  solo_medicos: {
    titulo: "El área médica es para profesionales de la salud",
    detalle:
      "Necesitas una cuenta de profesional con la acreditación validada. Si ya la tienes y sigues viendo esto, revisa el estado de tu acreditación en tu cuenta.",
  },
  solo_partners: {
    titulo: "El área Partners es para cuentas de empresa",
    detalle: "Distribuidores, mayoristas y clientes institucionales entran ahí. Tu cuenta no tiene ese perfil.",
  },
  solo_panel: {
    titulo: "Esa sección es del panel de administración",
    detalle: "La usa el equipo del grupo para revisar cuentas y publicar contenido. Tu cuenta no tiene acceso.",
  },
  medicos_fuera_de_alcance: {
    titulo: "La validación de médicos no está en tu alcance",
    detalle: "La lleva el equipo de GABAME, que es la empresa dueña del contenido para profesionales.",
  },
  contenido_fuera_de_alcance: {
    titulo: "El contenido para profesionales no está en tu alcance",
    detalle: "Lo edita el equipo de GABAME. Las publicaciones de tu empresa sí las administras desde Publicaciones.",
  },
  solo_administradores: {
    titulo: "Esa sección es para administradores",
    detalle: "Tu cuenta es de editor: administra publicaciones y contactos, no cuentas ni documentos.",
  },
};

export const PARAM_AVISO = "aviso";

/**
 * Devuelve el motivo solo si es una clave propia del catalogo. Cualquier otro valor se ignora.
 * Se usa `Object.hasOwn` y no el operador `in`: `in` recorre el prototipo, asi que `constructor`
 * o `__proto__` pasarian por motivos validos y la pantalla intentaria leer un texto que no existe.
 */
export function leerAviso(valor: string | string[] | null | undefined): MotivoAviso | null {
  if (typeof valor !== "string") return null;
  return Object.hasOwn(AVISOS_ACCESO, valor) ? (valor as MotivoAviso) : null;
}
