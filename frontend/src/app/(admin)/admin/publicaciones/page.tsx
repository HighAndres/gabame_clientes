import { Newspaper } from "lucide-react";
import Link from "next/link";

import { PublicacionForm } from "@/components/admin/publicacion-form";
import { TogglePublicada } from "@/components/admin/toggle-publicada";
import { Card, CardContent } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado } from "@/components/ui/estado";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { NOMBRE_AUDIENCIA, type PublicacionOut } from "@/types/admin";
import type { Audiencia, Empresa } from "@/types/auth";

const AUDIENCIAS: Audiencia[] = ["pacientes", "medicos", "partners"];

/** La vigencia es una fecha sin hora: construirla con `new Date(iso)` la correria un dia por la zona. */
function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

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
      <EncabezadoArea
        icono={Newspaper}
        etiqueta={`${NOMBRE_EMPRESA[empresa]} · Publicaciones`}
        titulo="Publicaciones del espacio"
        descripcion="Cada publicación va a una audiencia; el portal la muestra solo a quien corresponde."
        acciones={
          a.empresas.length > 1 && (
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
          )
        }
      />

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
                        {/* Una promocion vencida sigue marcada como publicada y no se ve: hay que decirlo aqui. */}
                        {p.vencida ? (
                          <span className="whitespace-nowrap text-xs font-bold text-destructive">Vigencia terminada</span>
                        ) : (
                          p.vigencia_hasta && (
                            <span className="whitespace-nowrap text-xs text-muted-foreground">
                              Hasta el {fechaCorta(p.vigencia_hasta)}
                            </span>
                          )
                        )}
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
