import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { Card, CardContent } from "@/components/ui/card";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { ApiError } from "@/lib/api";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PartnerAdminOut } from "@/types/admin";
import type { DocumentoOut } from "@/types/partner";

const SUBTIPO = { distribuidor: "Distribuidor", mayorista: "Mayorista", institucional: "Institucional" };
const TIPO: Record<string, string> = {
  constancia_fiscal: "Constancia de situacion fiscal",
  identificacion_representante: "Identificacion del representante",
  comprobante_domicilio: "Comprobante de domicilio",
  otro: "Otro documento",
};

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Detalle de un partner con revision documento por documento. El backend aplica el alcance. */
export default async function AdminPartnerDetallePage({ params }: { params: { id: string } }) {
  let partner: PartnerAdminOut;
  let docs: DocumentoOut[];
  try {
    [partner, docs] = await Promise.all([
      apiConSesion<PartnerAdminOut>(`/admin/partners/${encodeURIComponent(params.id)}`),
      apiConSesion<DocumentoOut[]>(`/admin/partners/${encodeURIComponent(params.id)}/documentos`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/partners" className="text-xs text-muted-foreground hover:text-primary">
          ← Partners
        </Link>
        <h1 className="text-[26px] font-bold">{partner.razon_social}</h1>
        <p className="text-sm text-muted-foreground">
          {SUBTIPO[partner.subtipo]} · {NOMBRE_EMPRESA[partner.empresa_objetivo]}
          {partner.rfc ? ` · RFC ${partner.rfc}` : ""} · {partner.nombre} {partner.apellidos} · {partner.email}
          {partner.telefono ? ` · ${partner.telefono}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Vinculo con {NOMBRE_EMPRESA[partner.empresa_objetivo]}</span>
            <span className="flex items-center gap-2">
              <Estado tono={tonoDeValidacion(partner.estado)} />
              {partner.motivo_rechazo && <span className="text-[13px] text-[#b03535]">{partner.motivo_rechazo}</span>}
              {partner.aprobado_en && partner.estado === "validado" && (
                <span className="text-[13px] text-muted-foreground">
                  desde el {new Date(partner.aprobado_en).toLocaleDateString("es-MX")}
                </span>
              )}
            </span>
          </div>
          <DecisionBotones
            estado={partner.estado}
            rutaAprobar={`/admin/partners/${partner.usuario_id}/aprobar`}
            rutaRechazar={`/admin/partners/${partner.usuario_id}/rechazar`}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Documentos ({docs.length})</h2>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_120px_110px_220px] bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
            <span>Requisito</span>
            <span>Archivo</span>
            <span>Estado</span>
            <span>Subido</span>
            <span />
          </div>
          {docs.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">El partner no ha subido documentos.</p>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className="grid items-center gap-3 border-t px-5 py-3.5 text-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_120px_110px_220px]"
            >
              <div className="flex flex-col">
                <span className="font-bold">{TIPO[d.tipo] ?? d.tipo}</span>
                {d.motivo_rechazo && <span className="text-xs text-[#b03535]">{d.motivo_rechazo}</span>}
              </div>
              <div className="flex min-w-0 flex-col">
                <a
                  href={`/api/backend/admin/partners/${partner.usuario_id}/documentos/${d.id}/archivo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:text-primary-hover"
                >
                  {d.nombre_archivo}
                </a>
                <span className="text-xs text-muted-foreground">{tamano(d.tamano_bytes)}</span>
              </div>
              <Estado tono={tonoDeValidacion(d.estado)} className="justify-self-start" />
              <span className="text-muted-foreground">{new Date(d.subido_en).toLocaleDateString("es-MX")}</span>
              <div className="md:justify-self-end">
                <DecisionBotones
                  estado={d.estado}
                  rutaAprobar={`/admin/partners/${partner.usuario_id}/documentos/${d.id}/validar`}
                  rutaRechazar={`/admin/partners/${partner.usuario_id}/documentos/${d.id}/rechazar`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
