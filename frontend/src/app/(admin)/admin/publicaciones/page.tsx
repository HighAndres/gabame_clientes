import Link from "next/link";

import { PublicacionForm } from "@/components/admin/publicacion-form";
import { TogglePublicada } from "@/components/admin/toggle-publicada";
import { Card, CardContent } from "@/components/ui/card";
import { Estado } from "@/components/ui/estado";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { NOMBRE_AUDIENCIA, type PublicacionOut } from "@/types/admin";
import type { Audiencia, Empresa } from "@/types/auth";

const AUDIENCIAS: Audiencia[] = ["pacientes", "medicos", "partners"];

/** Lo que cada empresa publica dentro de su espacio, por audiencia. Solo lo publicado llega al portal. */
export default async function PublicacionesPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const a = alcanceDe(u);
  const param = typeof searchParams.empresa === "string" ? searchParams.empresa : "";
  const empresa = (a.empresas.includes(param as Empresa) ? param : a.empresas[0]) as Empresa;
  const publicaciones = await apiConSesion<PublicacionOut[]>(`/admin/espacios/${empresa}/publicaciones`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{NOMBRE_EMPRESA[empresa]} · Publicaciones</p>
          <h1 className="text-[26px] font-bold">Publicaciones del espacio</h1>
          <p className="text-sm text-muted-foreground">Cada publicación va a una audiencia; el portal la muestra solo a quien corresponde.</p>
        </div>
        {a.empresas.length > 1 && (
          <nav className="flex flex-wrap gap-2 text-[13px]" aria-label="Empresa">
            {a.empresas.map((e) => (
              <Link
                key={e}
                href={`/admin/publicaciones?empresa=${e}`}
                aria-current={e === empresa ? "page" : undefined}
                className={cn(
                  "inline-flex h-[34px] items-center rounded-md px-3 font-bold",
                  e === empresa ? "bg-primary text-white" : "border text-heading hover:bg-background",
                )}
              >
                {NOMBRE_EMPRESA[e]}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-bold">Nueva publicación en {NOMBRE_EMPRESA[empresa]}</summary>
        <div className="pt-4">
          <PublicacionForm empresa={empresa} />
        </div>
      </details>

      {AUDIENCIAS.map((aud) => {
        const lista = publicaciones.filter((p) => p.audiencia === aud);
        return (
          <Card key={aud}>
            <CardContent className="flex flex-col gap-3 p-5">
              <h2 className="text-base font-bold">{NOMBRE_AUDIENCIA[aud]}</h2>
              {lista.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada publicado para esta audiencia.</p>
              ) : (
                <ul className="divide-y rounded-md border text-sm">
                  {lista.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Link href={`/admin/publicaciones/${p.id}`} className="truncate font-bold text-primary hover:text-primary-hover">
                          {p.titulo}
                        </Link>
                        <Estado tono={p.publicada ? "publicada" : "borrador"} />
                        <span className="text-xs text-muted-foreground">{new Date(p.actualizado_en).toLocaleDateString("es-MX")}</span>
                      </span>
                      <TogglePublicada ruta={`/admin/publicaciones/${p.id}`} publicada={p.publicada} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
