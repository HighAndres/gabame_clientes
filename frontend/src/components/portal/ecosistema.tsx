import { ArrowUpRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PiezaOut } from "@/types/admin";

const TIPO: Record<PiezaOut["tipo"], string> = { sitio: "Sitio", tienda: "Tienda", app: "App" };

/**
 * Marcas y tiendas del grupo como ENLACES. Nada mas: esta plataforma no consulta ninguna tienda.
 * Cada pieza aparece con su nombre (y el logo del grupo cuando es GABAME), nunca con su paleta.
 */
export async function Ecosistema({ titulo = "Marcas y tiendas del grupo" }: { titulo?: string }) {
  let piezas: PiezaOut[] = [];
  try {
    piezas = await apiConSesion<PiezaOut[]>("/ecosistema");
  } catch {
    return null;
  }
  if (piezas.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold">{titulo}</h2>
        <span className="text-[13px] text-muted-foreground">Enlaces a los sitios oficiales</span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {piezas.map((p) => (
          <Card key={p.producto} className={p.pendiente ? "opacity-60" : undefined}>
            <CardContent className="flex flex-col gap-2.5 p-5">
              <div className="flex h-10 items-center">
                {p.producto === "gabame" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/marca/logo-gabame.svg" alt="" className="h-[34px] w-auto" />
                ) : (
                  <span className="text-lg font-bold text-heading">{p.nombre}</span>
                )}
              </div>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {TIPO[p.tipo]}
                {p.empresa ? ` · ${NOMBRE_EMPRESA[p.empresa]}` : ""} · {p.descripcion}
              </p>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
                >
                  Visitar <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">{p.nombre}, se abre en otra pestana</span>
                </a>
              ) : (
                <span className="text-[13px] text-muted-foreground">Proximamente</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
