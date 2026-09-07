import Link from "next/link";
import { redirect } from "next/navigation";

import { AreaForm } from "@/components/admin/area-form";
import { FichaForm } from "@/components/admin/ficha-form";
import { TogglePublicada } from "@/components/admin/toggle-publicada";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/**
 * Admin de contenido Rx (mismo alcance que la validacion de medicos, ADR-0004).
 * # Pendiente 0.5 — el cliente entrega areas y fichas; aqui solo se capturan.
 * Los datos del Acordeon interno NO se capturan sin validacion del cliente.
 */
export default async function AdminContenidoPage() {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  const areas = await apiConSesion<AreaOut[]>("/admin/contenido/areas");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Contenido Rx</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fichas tecnicas por area terapeutica. Solo lo publicado llega a los profesionales validados.
        </p>
      </div>

      <AreaForm />

      {areas.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin areas todavia. Crea la primera arriba (pendiente 0.5).</p>
      )}

      <div className="space-y-6">
        {areas.map((a) => (
          <Card key={a.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {a.orden}. {a.nombre}{" "}
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs ${a.publicada ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {a.publicada ? "publicada" : "borrador"}
                    </span>
                  </CardTitle>
                  <CardDescription>{a.descripcion ?? `/${a.slug}`}</CardDescription>
                </div>
                <TogglePublicada ruta={`/admin/contenido/areas/${a.id}`} publicada={a.publicada} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {a.fichas.length > 0 && (
                <ul className="divide-y rounded-md border text-sm">
                  {a.fichas.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span>
                        <Link href={`/admin/contenido/fichas/${f.id}`} className="font-medium text-primary hover:underline">
                          {f.nombre}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">{f.publicada ? "publicada" : "borrador"}</span>
                      </span>
                      <TogglePublicada ruta={`/admin/contenido/fichas/${f.id}`} publicada={f.publicada} />
                    </li>
                  ))}
                </ul>
              )}
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">Nueva ficha en {a.nombre}</summary>
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
