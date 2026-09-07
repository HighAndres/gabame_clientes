/** Espejo de app/schemas/contenido.py. Contenido de PRODUCTO, nunca de pacientes. */

export interface FichaResumenOut {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  publicada: boolean;
}

export interface FichaOut extends FichaResumenOut {
  area_id: string;
  area_slug: string;
  area_nombre: string;
  contenido: string;
  actualizado_en: string;
}

export interface AreaOut {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  publicada: boolean;
  fichas: FichaResumenOut[];
}
