import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/** Entrada del area medica: resumen de areas. El layout ya filtra a quien no esta validado. */
export default async function MedicoPage() {
  const u = await leerUsuarioActual();
  if (!u || u.estado_medico !== "validado") return null;

  let areas: AreaOut[] = [];
  try {
    areas = await apiConSesion<AreaOut[]>("/medicos/areas");
  } catch {
    areas = [];
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[22px] font-bold">Portafolio Rx</h2>
        <span className="text-[13px] text-muted-foreground">
          {areas.length} {areas.length === 1 ? "area" : "areas"}
        </span>
      </div>
      {areas.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Aun no hay contenido publicado. Las fichas tecnicas se publican por area terapeutica conforme el grupo las
          libere.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[17px]">{a.nombre}</CardTitle>
                <CardDescription>
                  {a.fichas.length} {a.fichas.length === 1 ? "ficha tecnica" : "fichas tecnicas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {a.descripcion && <p className="leading-relaxed text-muted-foreground">{a.descripcion}</p>}
                <Link href={`/medico/${a.slug}`} className="font-bold text-primary hover:text-primary-hover">
                  Ver fichas
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
