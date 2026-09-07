import Link from "next/link";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PartnerAdminOut } from "@/types/admin";
import type { EstadoValidacion } from "@/types/auth";

const ESTADOS: EstadoValidacion[] = ["pendiente", "validado", "rechazado"];
const SUBTIPO = { distribuidor: "Distribuidor", mayorista: "Mayorista", institucional: "Institucional" };

/** Cola de aprobacion de partners. El backend filtra por la empresa del admin (ADR-0004). */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const estado = (ESTADOS.includes(searchParams.estado as EstadoValidacion) ? searchParams.estado : "pendiente") as EstadoValidacion;
  const partners = await apiConSesion<PartnerAdminOut[]>(`/admin/partners?estado=${estado}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Partners</h1>
          <p className="mt-1 text-sm text-muted-foreground">Distribuidores, mayoristas e institucionales por empresa.</p>
        </div>
        <div className="flex gap-2 text-sm">
          {ESTADOS.map((e) => (
            <Link
              key={e}
              href={`/admin/partners?estado=${e}`}
              className={`rounded-md border px-3 py-1 ${e === estado ? "border-primary text-primary" : "text-muted-foreground"}`}
            >
              {e}
            </Link>
          ))}
        </div>
      </div>

      {partners.length === 0 && <p className="text-sm text-muted-foreground">Nadie en estado {estado}.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {partners.map((p) => (
          <Card key={p.usuario_id}>
            <CardHeader>
              <CardTitle className="text-base">
                <Link href={`/admin/partners/${p.usuario_id}`} className="hover:underline">
                  {p.razon_social}
                </Link>
              </CardTitle>
              <CardDescription>
                {SUBTIPO[p.subtipo]} · {NOMBRE_EMPRESA[p.empresa_objetivo]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Contacto</dt>
                <dd>
                  {p.nombre} {p.apellidos} · {p.email}
                  {p.telefono ? ` · ${p.telefono}` : ""}
                </dd>
                <dt className="text-muted-foreground">RFC</dt>
                <dd className="font-mono">{p.rfc ?? "—"}</dd>
                <dt className="text-muted-foreground">Documentos</dt>
                <dd>
                  <Link href={`/admin/partners/${p.usuario_id}`} className="text-primary hover:underline">
                    {p.documentos} {p.documentos === 1 ? "documento" : "documentos"} · revisar
                  </Link>
                </dd>
                <dt className="text-muted-foreground">Solicitud</dt>
                <dd>{new Date(p.creado_en).toLocaleDateString("es-MX")}</dd>
                {p.motivo_rechazo && (
                  <>
                    <dt className="text-muted-foreground">Motivo</dt>
                    <dd>{p.motivo_rechazo}</dd>
                  </>
                )}
              </dl>
              <DecisionBotones
                estado={p.estado}
                rutaAprobar={`/admin/partners/${p.usuario_id}/aprobar`}
                rutaRechazar={`/admin/partners/${p.usuario_id}/rechazar`}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
