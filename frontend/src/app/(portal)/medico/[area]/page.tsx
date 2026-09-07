import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

export default async function AreaPage({ params }: { params: { area: string } }) {
  const u = await leerUsuarioActual();
  if (!u || u.estado_medico !== "validado") notFound();

  let area: AreaOut;
  try {
    area = await apiConSesion<AreaOut>(`/medicos/areas/${encodeURIComponent(params.area)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/medico" className="text-xs text-muted-foreground hover:underline">
          ← Area medica
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{area.nombre}</h1>
        {area.descripcion && <p className="mt-1 text-sm text-muted-foreground">{area.descripcion}</p>}
      </div>

      {area.fichas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aun no hay fichas publicadas en esta area.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {area.fichas.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <CardTitle className="text-base">{f.nombre}</CardTitle>
                {f.resumen && <CardDescription>{f.resumen}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Link href={`/medico/${area.slug}/${f.slug}`} className="text-sm text-primary hover:underline">
                  Ver ficha tecnica
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
