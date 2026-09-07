import Link from "next/link";
import { redirect } from "next/navigation";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { MedicoAdminOut } from "@/types/admin";
import type { EstadoValidacion } from "@/types/auth";

const ESTADOS: EstadoValidacion[] = ["pendiente", "validado", "rechazado"];

/**
 * Cola de validacion de medicos. La cedula se muestra aqui porque es lo que el admin valida;
 * es una vista interna solo para admins con alcance (ADR-0004).
 * # Pendiente 0.3 — el criterio de validacion; hoy es aprobacion manual.
 */
export default async function AdminMedicosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  const estado = (ESTADOS.includes(searchParams.estado as EstadoValidacion) ? searchParams.estado : "pendiente") as EstadoValidacion;
  const medicos = await apiConSesion<MedicoAdminOut[]>(`/admin/medicos?estado=${estado}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Medicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acreditacion profesional. Aprobacion manual (pendiente 0.3).</p>
        </div>
        <div className="flex gap-2 text-sm">
          {ESTADOS.map((e) => (
            <Link
              key={e}
              href={`/admin/medicos?estado=${e}`}
              className={`rounded-md border px-3 py-1 ${e === estado ? "border-primary text-primary" : "text-muted-foreground"}`}
            >
              {e}
            </Link>
          ))}
        </div>
      </div>

      {medicos.length === 0 && <p className="text-sm text-muted-foreground">Nadie en estado {estado}.</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {medicos.map((m) => (
          <Card key={m.usuario_id}>
            <CardHeader>
              <CardTitle className="text-base">
                {m.nombre} {m.apellidos}
              </CardTitle>
              <CardDescription>{m.email}{m.telefono ? ` · ${m.telefono}` : ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Cedula</dt>
                <dd className="font-mono">{m.cedula_profesional}</dd>
                <dt className="text-muted-foreground">Especialidad</dt>
                <dd>{m.especialidad ?? "—"}</dd>
                <dt className="text-muted-foreground">Institucion</dt>
                <dd>{m.institucion ?? "—"}</dd>
                <dt className="text-muted-foreground">Origen</dt>
                <dd>{m.origen_inicial}</dd>
                <dt className="text-muted-foreground">Solicitud</dt>
                <dd>{new Date(m.creado_en).toLocaleDateString("es-MX")}</dd>
                {m.motivo_rechazo && (
                  <>
                    <dt className="text-muted-foreground">Motivo</dt>
                    <dd>{m.motivo_rechazo}</dd>
                  </>
                )}
              </dl>
              <DecisionBotones
                estado={m.estado}
                rutaAprobar={`/admin/medicos/${m.usuario_id}/validar`}
                rutaRechazar={`/admin/medicos/${m.usuario_id}/rechazar`}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
