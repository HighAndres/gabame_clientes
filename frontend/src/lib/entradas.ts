import type { Empresa, TipoCuenta } from "@/types/auth";

/**
 * Puertas de entrada por audiencia: las UNICAS URLs que los sitios del grupo enlazan. Lo que
 * hay detras (login, registro, destino) puede cambiar sin tocar los sitios.
 *
 * Cada sitio agrega `?origen=<pieza>` (y opcionalmente `ruta=` y `campana=`); la persona se
 * queda en el portal al entrar. Los fragmentos para pegar en cada sitio estan en
 * docs/puntos-de-entrada.md y se generan con `enlaceEntrada`.
 */
export type Entrada = "medicos" | "clientes" | "empresas";

export interface DefinicionEntrada {
  ruta: string; // URL publica de la puerta
  boton: string; // texto del boton en el sitio
  titulo: string;
  resumen: string; // una linea, para las tarjetas de la portada
  descripcion: string;
  tipo: TipoCuenta; // tipo de cuenta que preselecciona el registro
  destino: string; // a donde va la persona al entrar
  entrar: string; // texto del boton "entrar"
  crear: string; // texto del boton "crear cuenta"
}

export const ENTRADAS: Record<Entrada, DefinicionEntrada> = {
  medicos: {
    ruta: "/medicos",
    boton: "Área médica",
    titulo: "Área médica",
    resumen: "Información técnica del portafolio, con cédula validada.",
    descripcion:
      "Información técnica del portafolio para profesionales de la salud. Entra con tu cuenta o crea una con tu cédula profesional; el acceso se activa cuando el grupo valida tu acreditación.",
    tipo: "profesional",
    destino: "/medico",
    entrar: "Entrar al área médica",
    crear: "Crear cuenta como profesional",
  },
  clientes: {
    ruta: "/clientes",
    boton: "Portal de clientes",
    titulo: "Portal de clientes",
    resumen: "Marcas del grupo y farmacia en línea.",
    descripcion: "Las marcas, tiendas y novedades del grupo en un solo lugar. Entra con tu cuenta o crea una en un minuto.",
    tipo: "paciente",
    destino: "/dashboard",
    entrar: "Entrar",
    crear: "Crear cuenta",
  },
  empresas: {
    ruta: "/empresas",
    boton: "Empresas y distribuidores",
    titulo: "Empresas y distribuidores",
    resumen: "Documentos, contactos comerciales y portales operativos.",
    descripcion:
      "Distribuidores, mayoristas y clientes institucionales: documentos, contactos comerciales y portales operativos de cada empresa del grupo. La relación con cada empresa se aprueba por separado.",
    tipo: "empresa",
    destino: "/partner",
    entrar: "Entrar a Partners",
    crear: "Solicitar cuenta de empresa",
  },
};

/** Puerta a partir de un tipo de cuenta (para login y registro con `?tipo=`). */
export function entradaPorTipo(tipo: string | null | undefined): DefinicionEntrada | null {
  if (!tipo) return null;
  return Object.values(ENTRADAS).find((e) => e.tipo === tipo) ?? null;
}

/** Parametros que la puerta conserva al pasar a login o registro. */
export const PARAM_TIPO = "tipo";
export const PARAM_EMPRESA = "empresa";

/**
 * URL absoluta de una puerta para pegar en un sitio del grupo.
 * `origen` es la pieza desde la que se enlaza; `empresa` preselecciona la empresa en el registro
 * de partners (sitios de Medinter, Ordan y A7).
 */
export function enlaceEntrada(
  base: string,
  entrada: Entrada,
  origen: string,
  extra: { empresa?: Empresa; ruta?: string; campana?: string } = {},
): string {
  const url = new URL(ENTRADAS[entrada].ruta, base);
  url.searchParams.set("origen", origen);
  if (extra.empresa) url.searchParams.set(PARAM_EMPRESA, extra.empresa);
  if (extra.ruta) url.searchParams.set("ruta", extra.ruta);
  if (extra.campana) url.searchParams.set("campana", extra.campana);
  return url.toString();
}
