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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[22px] font-bold">{area.nombre}</h2>
          <span className="text-[13px] text-muted-foreground">
            {area.fichas.length} {area.fichas.length === 1 ? "ficha tecnica" : "fichas tecnicas"}
          </span>
        </div>
        {area.descripcion && <p className="text-sm text-muted-foreground">{area.descripcion}</p>}
      </div>

      {area.fichas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aún no hay fichas publicadas en esta área.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {area.fichas.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Ficha técnica</p>
                <CardTitle className="text-[17px]">{f.nombre}</CardTitle>
                {f.resumen && <CardDescription>{f.resumen}</CardDescription>}
              </CardHeader>
              <CardContent>
                <Link href={`/medico/${area.slug}/${f.slug}`} className="text-sm font-bold text-primary hover:text-primary-hover">
                  Ver ficha
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
