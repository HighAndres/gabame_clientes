import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AreaForm } from "@/components/admin/area-form";
import { FichaForm } from "@/components/admin/ficha-form";
import { TogglePublicada } from "@/components/admin/toggle-publicada";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado } from "@/components/ui/estado";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/**
 * Admin de contenido Rx (mismo alcance que la validacion de medicos, ADR-0004).
 * El cliente entrega areas y fichas; aqui solo se capturan. Sin datos del Acordeon interno.
 */
export default async function AdminContenidoPage() {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  const areas = await apiConSesion<AreaOut[]>("/admin/contenido/areas");

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoArea
        icono={FileText}
        etiqueta="GABAME · Contenido Rx"
        titulo="Fichas técnicas por área terapéutica"
        descripcion="Solo lo publicado llega a los profesionales validados."
      />

      <AreaForm />

      {areas.length === 0 && <p className="text-sm text-muted-foreground">Sin áreas todavía. Crea la primera arriba.</p>}

      <div className="flex flex-col gap-5">
        {areas.map((a) => (
          <Card key={a.id}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-3">
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-base font-bold text-heading">
                  <span className="text-muted-foreground">{a.orden}.</span> {a.nombre}
                  <Estado tono={a.publicada ? "publicada" : "borrador"} />
                </span>
                <span className="text-[13px] text-muted-foreground">{a.descripcion ?? `/${a.slug}`}</span>
              </div>
              <TogglePublicada ruta={`/admin/contenido/areas/${a.id}`} publicada={a.publicada} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {a.fichas.length > 0 && (
                <ul className="divide-y rounded-md border text-sm">
                  {a.fichas.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="flex items-center gap-2">
                        <Link href={`/admin/contenido/fichas/${f.id}`} className="font-bold text-primary hover:text-primary-hover">
                          {f.nombre}
                        </Link>
                        <Estado tono={f.publicada ? "publicada" : "borrador"} />
                      </span>
                      <TogglePublicada ruta={`/admin/contenido/fichas/${f.id}`} publicada={f.publicada} />
                    </li>
                  ))}
                </ul>
              )}
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-bold">Nueva ficha en {a.nombre}</summary>
                <div className="pt-3">
                  <FichaForm areaId={a.id} />
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
