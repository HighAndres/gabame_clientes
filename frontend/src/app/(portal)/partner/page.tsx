import { ArrowUpRight } from "lucide-react";

import { FilaRequisito } from "@/components/partner/subir-documento";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { ApiError } from "@/lib/api";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EstadoPartnerOut } from "@/types/partner";

const SUBTIPO = { distribuidor: "Distribuidor", mayorista: "Mayorista", institucional: "Cliente institucional" };
const TEXTO_VINCULO = { pendiente: "En revision", validado: "Aprobado", rechazado: "No aprobado" };

/**
 * Area Partners (lienzo aprobado): encabezado con vinculos por empresa, tabla de documentos y
 * contactos comerciales. Hoy el partner tiene una empresa (`empresa_objetivo`); el corte 2
 * trae los vinculos multiples.
 * # Pendiente 0.4 — requisitos documentales provisionales del backend.
 * # Pendiente — contactos comerciales y portales operativos: los entrega el cliente.
 */
export default async function PartnerPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;

  let p: EstadoPartnerOut | null = null;
  try {
    p = await apiConSesion<EstadoPartnerOut>("/partners/me");
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 403)) throw e;
  }

  if (!p) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">GABAME Partners</h1>
        <Alert>
          <AlertTitle>Sin perfil de partner</AlertTitle>
          <AlertDescription>No encontramos un perfil de partner asociado a tu cuenta.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const aprobado = p.estado === "validado";
  const obligatorios = p.requisitos.filter((r) => r.obligatorio);
  const aceptados = obligatorios.filter((r) => r.documentos.some((d) => d.estado === "validado")).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold">{p.razon_social}</h1>
          <p className="text-[15px] text-muted-foreground">
            {SUBTIPO[p.subtipo]}
            {p.rfc ? ` · RFC ${p.rfc}` : ""}
          </p>
        </div>
        <Card className="min-w-[200px]">
          <CardContent className="flex flex-col gap-1.5 p-4">
            <span className="text-xs text-muted-foreground">Vinculo con {NOMBRE_EMPRESA[p.empresa_objetivo]}</span>
            <Estado tono={tonoDeValidacion(p.estado)} className="self-start">
              {TEXTO_VINCULO[p.estado]}
            </Estado>
          </CardContent>
        </Card>
      </div>

      {p.estado === "rechazado" && (
        <Alert variant="destructive">
          <AlertTitle>Solicitud no aprobada</AlertTitle>
          <AlertDescription>{p.motivo_rechazo ?? "Contacta al equipo comercial de la empresa."}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold">Documentos</h2>
            <span className="text-[13px] text-muted-foreground">
              {aceptados} de {obligatorios.length} obligatorios aceptados
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="hidden grid-cols-[minmax(0,1fr)_170px_120px_140px] bg-background px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
              <span>Requisito</span>
              <span>Archivo</span>
              <span>Estado</span>
              <span />
            </div>
            {p.requisitos.map((r) => (
              <FilaRequisito
                key={r.tipo}
                tipo={r.tipo}
                nombre={r.nombre}
                descripcion={r.descripcion}
                obligatorio={r.obligatorio}
                documentos={r.documentos}
                limiteMb={p.limite_mb}
                tiposPermitidos={p.tipos_permitidos}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, JPG o PNG, hasta {p.limite_mb} MB por archivo. Lista provisional hasta que el grupo confirme los requisitos por
            tipo de partner.
          </p>
        </section>

        <aside className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Contactos comerciales</h2>
          {!aprobado ? (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                Disponibles cuando tu vinculo este aprobado. El equipo de {NOMBRE_EMPRESA[p.empresa_objetivo]} revisara tus
                documentos y te avisaremos por correo.
              </CardContent>
            </Card>
          ) : (
            p.contactos.map((c) => (
              <Card key={c.empresa} className={c.pendiente ? "opacity-70" : undefined}>
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-[13px] font-bold text-heading">
                      {NOMBRE_EMPRESA[c.empresa].slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-[15px] font-bold">{NOMBRE_EMPRESA[c.empresa]}</span>
                  </div>
                  {c.pendiente ? (
                    <p className="text-[13px] text-muted-foreground">Contacto comercial por confirmar.</p>
                  ) : (
                    <div className="flex flex-col gap-1 text-sm">
                      {c.nombre && <span>{c.nombre}</span>}
                      {c.email && <span>{c.email}</span>}
                      {c.telefono && <span>{c.telefono}</span>}
                      {c.portal_url && (
                        <a
                          href={c.portal_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 font-bold text-primary hover:text-primary-hover"
                        >
                          Portal operativo <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
