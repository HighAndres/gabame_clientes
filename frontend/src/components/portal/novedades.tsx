import Link from "next/link";

import { LogoEmpresa } from "@/components/marca/logo-empresa";
import { Card, CardContent } from "@/components/ui/card";
import { ETIQUETA_AUDIENCIA, novedadesDe } from "@/lib/novedades";
import type { EspacioMioOut } from "@/types/espacios";

/**
 * Lo publicado para esta persona por todas las empresas del grupo, junto en el inicio.
 *
 * Sirve sobre todo al paciente, que es el rol con menos superficie propia: hasta ahora tenia que
 * entrar empresa por empresa para encontrar contenido que ya existia. El backend decide que
 * publicaciones vienen en cada espacio; esto solo las reune.
 */
export function Novedades({ espacios, limite = 6 }: { espacios: EspacioMioOut[]; limite?: number }) {
  const novedades = novedadesDe(espacios, limite);
  if (novedades.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold">Novedades del grupo</h2>
        <Link href="/espacios" className="text-[13px] font-bold text-primary hover:text-primary-hover">
          Ver por empresa
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {novedades.map((n) => {
          const etiqueta = ETIQUETA_AUDIENCIA[n.audiencia];
          return (
            <Card key={n.id}>
              <CardContent className="flex h-full flex-col gap-2.5 p-5">
                <div className="flex items-center gap-2.5">
                  <LogoEmpresa empresa={n.empresa} nombre={n.empresaNombre} tamano="sm" />
                  <span className="text-xs text-muted-foreground">{n.empresaNombre}</span>
                  {etiqueta && (
                    <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary-soft-foreground">
                      {etiqueta}
                    </span>
                  )}
                </div>
                <Link href={n.href} className="text-[15px] font-bold hover:text-primary">
                  {n.titulo}
                </Link>
                {n.resumen && <p className="text-[13px] leading-relaxed text-muted-foreground">{n.resumen}</p>}
                <span className="mt-auto pt-1 text-xs text-muted-foreground">
                  {new Date(n.actualizado_en).toLocaleDateString("es-MX")}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
