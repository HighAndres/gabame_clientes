import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoEmpresa } from "@/components/marca/logo-empresa";
import { Card, CardContent } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { ApiError } from "@/lib/api";
import { EMPRESAS } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { Empresa } from "@/types/auth";
import { AUDIENCIAS, type EspacioMioOut, TITULO_AUDIENCIA } from "@/types/espacios";
import { TEXTO_VINCULO } from "@/types/partner";

/**
 * Espacio de una empresa (corte 4): identidad de la empresa con la paleta del grupo, vinculo y
 * contacto si es partner aprobado, y las publicaciones por audiencia que la persona puede ver.
 * Las audiencias las decide el backend; aqui solo se pintan.
 */
export default async function EspacioPage({ params }: { params: { empresa: string } }) {
  if (!EMPRESAS.includes(params.empresa as Empresa)) notFound();
  const u = await leerUsuarioActual();
  if (!u) return null;

  let e: EspacioMioOut;
  try {
    e = await apiConSesion<EspacioMioOut>(`/espacios/${params.empresa}/mio`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  const medico = u.estado_medico === "validado";
  const vinculoPendiente = e.vinculo_estado === "pendiente";

  return (
    <div className="flex flex-col gap-8">
      {/* Aqui la marca del area es la de la empresa, no un icono: es su espacio. */}
      <EncabezadoArea
        marca={<LogoEmpresa empresa={e.empresa} nombre={e.nombre} tamano="lg" />}
        etiqueta="Empresa del grupo"
        titulo={e.nombre}
        volver={{ href: "/espacios", texto: "Empresas del grupo" }}
        estado={
          e.vinculo_estado ? (
            <Estado tono={tonoDeValidacion(e.vinculo_estado)}>
              Vínculo {TEXTO_VINCULO[e.vinculo_estado].toLowerCase()}
            </Estado>
          ) : undefined
        }
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8">
          {AUDIENCIAS.filter((a) => e.audiencias.includes(a)).map((a) => {
            const lista = e.publicaciones.filter((p) => p.audiencia === a);
            return (
              <section key={a} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold">{TITULO_AUDIENCIA[a]}</h2>
                {lista.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin publicaciones por ahora.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {lista.map((p) => (
                      <Card key={p.id}>
                        <CardContent className="flex flex-col gap-2 p-5">
                          <Link href={`/espacios/${e.empresa}/${p.audiencia}/${p.slug}`} className="text-[15px] font-bold hover:text-primary">
                            {p.titulo}
                          </Link>
                          {p.resumen && <p className="text-[13px] leading-relaxed text-muted-foreground">{p.resumen}</p>}
                          <span className="text-xs text-muted-foreground">{new Date(p.actualizado_en).toLocaleDateString("es-MX")}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
          {e.empresa === "gabame" && medico && (
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold">Área médica</span>
                  <span className="text-[13px] text-muted-foreground">Fichas técnicas por área terapéutica.</span>
                </span>
                <Link href="/medico" className="text-sm font-bold text-primary hover:text-primary-hover">
                  Ir al área médica
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {vinculoPendiente && (
            <Card>
              <CardContent className="p-5 text-[13px] leading-relaxed text-muted-foreground">
                Tu solicitud con {e.nombre} está en revisión. Cuando la aprueben verás aquí el contenido para partners y el
                contacto comercial.
              </CardContent>
            </Card>
          )}
          {e.contacto && (
            <Card>
              <CardContent className="flex flex-col gap-2 p-5 text-sm">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Contacto comercial</span>
                {e.contacto.pendiente ? (
                  <span className="text-[13px] text-muted-foreground">Por confirmar.</span>
                ) : (
                  <>
                    {e.contacto.nombre && <span>{e.contacto.nombre}</span>}
                    {e.contacto.email && (
                      <a href={`mailto:${e.contacto.email}`} className="text-primary hover:text-primary-hover">
                        {e.contacto.email}
                      </a>
                    )}
                    {e.contacto.telefono && <span>{e.contacto.telefono}</span>}
                  </>
                )}
              </CardContent>
            </Card>
          )}
          {e.portal_url && e.vinculo_estado === "validado" && (
            <a
              href={e.portal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover"
            >
              Portal operativo de {e.nombre} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
          {e.vinculo_estado && (
            <Link href="/partner" className="text-sm font-bold text-primary hover:text-primary-hover">
              Mis documentos y vínculos
            </Link>
          )}
        </aside>
      </div>
    </div>
  );
}
