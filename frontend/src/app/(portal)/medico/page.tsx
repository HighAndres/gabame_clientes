import Link from "next/link";

import { Farmacias } from "@/components/portal/farmacias";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";
import type { EspacioMioOut, PublicacionResumenOut } from "@/types/espacios";

/**
 * Entrada del area medica. El layout ya filtro a quien no esta validado.
 *
 * Primero Farmacias GABAME, que es lo que el profesional usa a diario; despues el portafolio Rx,
 * que hoy esta vacio hasta que el cliente entregue el contenido (pendiente 0.5).
 */
export default async function MedicoPage() {
  const u = await leerUsuarioActual();
  if (!u || u.estado_medico !== "validado") return null;

  let areas: AreaOut[] = [];
  try {
    areas = await apiConSesion<AreaOut[]>("/medicos/areas");
  } catch {
    areas = [];
  }
  let paraMedicos: PublicacionResumenOut[] = [];
  try {
    const gabame = await apiConSesion<EspacioMioOut>("/espacios/gabame/mio");
    paraMedicos = gabame.publicaciones.filter((p) => p.audiencia === "medicos");
  } catch {
    paraMedicos = [];
  }
  // Lo que lleva a la tienda es promocion; lo demas es comunicado y va con el portafolio.
  const promociones = paraMedicos.filter((p) => p.url_externa || p.vigencia_hasta);
  const comunicados = paraMedicos.filter((p) => !promociones.includes(p));

  return (
    <div className="flex flex-col gap-9">
      <Farmacias promociones={promociones} />

      <section className="flex flex-col gap-5 border-t pt-7">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[22px] font-bold">Portafolio Rx</h2>
          {areas.length > 0 && (
            <span className="text-[13px] text-muted-foreground">
              {areas.length} {areas.length === 1 ? "área" : "áreas"}
            </span>
          )}
        </div>
        {areas.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Aún no hay contenido publicado. Las fichas técnicas se publican por área terapéutica conforme
            el grupo las libere, y te avisamos por correo cuando haya material nuevo.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {areas.map((a) => (
              <Card key={a.id} className="tarjeta-enlace">
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
      </section>

      {comunicados.length > 0 && (
        <section className="flex flex-col gap-3 border-t pt-7">
          <h2 className="text-[17px] font-bold">Más de GABAME para profesionales</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {comunicados.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/espacios/gabame/medicos/${p.slug}`}
                  className="font-bold text-primary hover:text-primary-hover"
                >
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
