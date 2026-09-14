import type { Audiencia, Empresa } from "@/types/auth";
import type { EspacioMioOut } from "@/types/espacios";

/**
 * Lo que las empresas del grupo ya publicaron para esta persona, junto y ordenado por fecha.
 *
 * No decide permisos: el backend solo devuelve en cada espacio las publicaciones de las audiencias
 * que la persona puede ver (`audiencias_permitidas`). Esto unicamente las junta para no obligar a
 * entrar empresa por empresa a buscarlas.
 */
export interface Novedad {
  id: string;
  empresa: Empresa;
  empresaNombre: string;
  audiencia: Audiencia;
  titulo: string;
  resumen: string | null;
  actualizado_en: string;
  href: string;
}

/** Etiqueta corta de la audiencia. Para pacientes no se etiqueta: es lo que cualquiera ve. */
export const ETIQUETA_AUDIENCIA: Record<Audiencia, string | null> = {
  pacientes: null,
  medicos: "Profesionales",
  partners: "Partners",
};

export function novedadesDe(espacios: EspacioMioOut[], limite = 6): Novedad[] {
  const todas = espacios.flatMap((e) =>
    e.publicaciones.map((p) => ({
      id: p.id,
      empresa: e.empresa,
      empresaNombre: e.nombre,
      audiencia: p.audiencia,
      titulo: p.titulo,
      resumen: p.resumen,
      actualizado_en: p.actualizado_en,
      href: `/espacios/${e.empresa}/${p.audiencia}/${p.slug}`,
    })),
  );
  // Mas reciente primero; empate por titulo para que el orden sea estable entre recargas.
  todas.sort((a, b) => b.actualizado_en.localeCompare(a.actualizado_en) || a.titulo.localeCompare(b.titulo));
  return todas.slice(0, limite);
}
