import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";
import type { EspacioMioOut } from "@/types/espacios";

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
  let paraMedicos: EspacioMioOut["publicaciones"] = [];
  try {
    const gabame = await apiConSesion<EspacioMioOut>("/espacios/gabame/mio");
    paraMedicos = gabame.publicaciones.filter((p) => p.audiencia === "medicos");
  } catch {
    paraMedicos = [];
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
          Aún no hay contenido publicado. Las fichas técnicas se publican por área terapéutica conforme el grupo las
          libere.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-[17px]">{a.nombre}</CardTitle>
                <CardDescription>
                  {a.fichas.length} {a.fichas.length === 1 ? "ficha técnica" : "fichas técnicas"}
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

      {paraMedicos.length > 0 && (
        <section className="flex flex-col gap-3 border-t pt-5">
          <h3 className="text-[17px] font-bold">Más de GABAME para profesionales</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {paraMedicos.map((p) => (
              <li key={p.id}>
                <Link href={`/espacios/gabame/medicos/${p.slug}`} className="font-bold text-primary hover:text-primary-hover">
                  {p.titulo}
                </Link>
                {p.resumen && <span className="text-muted-foreground"> · {p.resumen}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
