import Link from "next/link";
import { notFound } from "next/navigation";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Documentos de un partner con revision individual. El backend aplica el alcance por empresa. */
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
    <div className="space-y-6">
      <div>
        <Link href="/admin/partners" className="text-xs text-muted-foreground hover:underline">
          ← Partners
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{partner.razon_social}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUBTIPO[partner.subtipo]} · {NOMBRE_EMPRESA[partner.empresa_objetivo]} · {partner.nombre} {partner.apellidos} ·{" "}
          {partner.email} · cuenta {partner.estado}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuenta Partners</CardTitle>
          <CardDescription>
            {partner.estado === "pendiente" && "Revisa los documentos y decide sobre la cuenta."}
            {partner.estado === "validado" && "Cuenta aprobada."}
            {partner.estado === "rechazado" && `Rechazada: ${partner.motivo_rechazo ?? ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DecisionBotones
            estado={partner.estado}
            rutaAprobar={`/admin/partners/${partner.usuario_id}/aprobar`}
            rutaRechazar={`/admin/partners/${partner.usuario_id}/rechazar`}
          />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos ({docs.length})</h2>
        {docs.length === 0 && <p className="text-sm text-muted-foreground">El partner no ha subido documentos.</p>}
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{TIPO[d.tipo] ?? d.tipo}</CardTitle>
                <CardDescription>
                  <a
                    href={`/api/backend/admin/partners/${partner.usuario_id}/documentos/${d.id}/archivo`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {d.nombre_archivo}
                  </a>{" "}
                  · {Math.max(1, Math.round(d.tamano_bytes / 1024))} KB · subido el{" "}
                  {new Date(d.subido_en).toLocaleDateString("es-MX")} · {d.estado}
                  {d.motivo_rechazo && ` (${d.motivo_rechazo})`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DecisionBotones
                  estado={d.estado}
                  rutaAprobar={`/admin/partners/${partner.usuario_id}/documentos/${d.id}/validar`}
                  rutaRechazar={`/admin/partners/${partner.usuario_id}/documentos/${d.id}/rechazar`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
