/** Espejo de app/schemas/espacios.py: lo que cada persona ve de cada empresa (corte 4). */

import type { Audiencia, Empresa, EstadoValidacion, Modulo } from "@/types/auth";
import type { ContactoEmpresaOut } from "@/types/partner";

export interface PublicacionResumenOut {
  id: string;
  audiencia: Audiencia;
  slug: string;
  titulo: string;
  resumen: string | null;
  orden: number;
  /** Último día en que se muestra; el backend ya filtró las vencidas. */
  vigencia_hasta: string | null;
  /** Adónde lleva fuera del portal (la tienda del grupo). */
  url_externa: string | null;
  actualizado_en: string;
}

export interface EspacioMioOut {
  empresa: Empresa;
  nombre: string;
  modulos: Modulo[];
  portal_url: string | null;
  /** Audiencias que la persona puede ver en este espacio (espejo de `audiencias_permitidas`). */
  audiencias: Audiencia[];
  vinculo_estado: EstadoValidacion | null;
  contacto: ContactoEmpresaOut | null;
  publicaciones: PublicacionResumenOut[];
}

export const AUDIENCIAS: Audiencia[] = ["pacientes", "medicos", "partners"];

/** Titulos de seccion dentro de un espacio, en el lenguaje de quien lo lee. */
export const TITULO_AUDIENCIA: Record<Audiencia, string> = {
  pacientes: "Para ti",
  medicos: "Para profesionales de la salud",
  partners: "Para partners",
};
