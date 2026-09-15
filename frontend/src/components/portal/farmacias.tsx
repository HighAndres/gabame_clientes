import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { apiConSesion } from "@/lib/sesion";
import type { PiezaOut } from "@/types/admin";
import type { PublicacionResumenOut } from "@/types/espacios";

/** Clave interna de Farmacias GABAME en `Producto` (se conserva por los origenes ya guardados). */
const TIENDA = "tiendagabame";
const APP = "app_paciente";

function vigencia(hasta: string | null): string | null {
  if (!hasta) return null;
  const [anio, mes, dia] = hasta.split("-").map(Number);
  return `Vigente hasta el ${new Date(anio, mes - 1, dia).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  })}`;
}

/**
 * Farmacias GABAME para el profesional de la salud: sus promociones vigentes y el salto a la
 * tienda. Las promociones son publicaciones del espacio de GABAME para la audiencia de medicos
 * (las captura el panel), no una consulta a la tienda: esta plataforma no lee su base (regla 2).
 *
 * La URL de la tienda y la de la app salen del catalogo del ecosistema, asi que mover una de
 * dominio no toca esta pantalla; la app aparece sola cuando exista.
 */
export async function Farmacias({ promociones }: { promociones: PublicacionResumenOut[] }) {
  let piezas: PiezaOut[] = [];
  try {
    piezas = await apiConSesion<PiezaOut[]>("/ecosistema");
  } catch {
    piezas = [];
  }
  const tienda = piezas.find((p) => p.producto === TIENDA);
  const app = piezas.find((p) => p.producto === APP);
  if (!tienda && promociones.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[22px] font-bold">{tienda?.nombre ?? "Farmacias GABAME"}</h2>
        <div className="flex flex-wrap items-center gap-4">
          {tienda?.url && (
            <a
              href={tienda.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
            >
              Ir a la tienda <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">se abre en otra pestaña</span>
            </a>
          )}
          {app?.url ? (
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
            >
              Abrir la app <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">se abre en otra pestaña</span>
            </a>
          ) : (
            // MB-V005 — el boton a la app medico-paciente aparece solo cuando exista su URL.
            <span className="text-[13px] text-muted-foreground">App para profesionales: próximamente</span>
          )}
        </div>
      </div>

      {promociones.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Por ahora no hay promociones vigentes para profesionales de la salud. Cuando las haya,
          aparecen aquí.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {promociones.map((p) => {
            const fin = vigencia(p.vigencia_hasta);
            return (
              <Card key={p.id} className="tarjeta-enlace">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <h3 className="text-[17px] font-bold text-heading">{p.titulo}</h3>
                  {p.resumen && <p className="text-sm leading-relaxed text-muted-foreground">{p.resumen}</p>}
                  {fin && <p className="text-xs text-muted-foreground">{fin}</p>}
                  <div className="mt-auto pt-2">
                    {p.url_externa ? (
                      <a
                        href={p.url_externa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
                      >
                        Ver en la tienda <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="sr-only">se abre en otra pestaña</span>
                      </a>
                    ) : (
                      <Link
                        href={`/espacios/gabame/medicos/${p.slug}`}
                        className="text-sm font-bold text-primary hover:text-primary-hover"
                      >
                        Ver detalle
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
