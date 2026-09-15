import { Fila, Lista, TituloSeccion } from "@/components/ui/lista";
import { ETIQUETA_AUDIENCIA, novedadesDe } from "@/lib/novedades";
import type { EspacioMioOut } from "@/types/espacios";

/**
 * Lo publicado para esta persona por todas las empresas del grupo, junto en el inicio.
 *
 * Sirve sobre todo al paciente, que es el rol con menos superficie propia: hasta ahora tenia que
 * entrar empresa por empresa para encontrar contenido que ya existia. El backend decide que
 * publicaciones vienen en cada espacio; esto solo las reune.
 *
 * Va como lista y no como tarjetas: son elementos equivalentes que se recorren con la vista, y
 * repetir el logotipo del grupo en cada uno era ruido, no marca. La empresa se dice con su nombre.
 */
export function Novedades({ espacios, limite = 6 }: { espacios: EspacioMioOut[]; limite?: number }) {
  const novedades = novedadesDe(espacios, limite);
  if (novedades.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <TituloSeccion href="/espacios" accion="Ver por empresa">
        Novedades del grupo
      </TituloSeccion>
      <Lista>
        {novedades.map((n) => {
          const etiqueta = ETIQUETA_AUDIENCIA[n.audiencia];
          return (
            <Fila
              key={n.id}
              href={n.href}
              titulo={n.titulo}
              meta={
                <>
                  {n.empresaNombre}
                  {etiqueta ? ` · ${etiqueta}` : ""}
                  {n.resumen ? ` · ${n.resumen}` : ""}
                </>
              }
              derecha={new Date(n.actualizado_en).toLocaleDateString("es-MX")}
            />
          );
        })}
      </Lista>
    </section>
  );
}
