import Link from "next/link";
import { redirect } from "next/navigation";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import type { MedicoAdminOut } from "@/types/admin";
import type { EstadoValidacion } from "@/types/auth";

const ESTADOS: { valor: EstadoValidacion; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "validado", texto: "Validados" },
  { valor: "rechazado", texto: "Rechazados" },
];

/**
 * Cola de validacion de medicos. La cedula se muestra aqui porque es lo que el admin valida;
 * es una vista interna solo para admins con alcance (ADR-0004). Aprobacion manual (pendiente 0.3).
 */
export default async function AdminMedicosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  const estado = (ESTADOS.some((e) => e.valor === searchParams.estado) ? searchParams.estado : "pendiente") as EstadoValidacion;
  const medicos = await apiConSesion<MedicoAdminOut[]>(`/admin/medicos?estado=${estado}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">GABAME · Médicos</p>
          <h1 className="text-[26px] font-bold">Acreditaciones profesionales</h1>
        </div>
        <nav className="flex gap-2 text-[13px]" aria-label="Filtrar por estado">
          {ESTADOS.map((e) => (
            <Link
              key={e.valor}
              href={`/admin/medicos?estado=${e.valor}`}
              aria-current={e.valor === estado ? "page" : undefined}
              className={cn(
                "inline-flex h-[34px] items-center rounded-md px-3 font-bold",
                e.valor === estado ? "bg-primary text-white" : "border text-heading hover:bg-background",
              )}
            >
              {e.texto}
            </Link>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_140px_130px_110px_220px] bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
          <span>Profesional</span>
          <span>Contacto</span>
          <span>Cédula</span>
          <span>Especialidad</span>
          <span>Solicitud</span>
          <span />
        </div>
        {medicos.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nadie en este estado.</p>}
        {medicos.map((m) => (
          <div
            key={m.usuario_id}
            className="grid items-center gap-3 border-t px-5 py-3.5 text-sm md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_140px_130px_110px_220px]"
          >
            <div className="flex flex-col">
              <span className="font-bold">
                {m.nombre} {m.apellidos}
              </span>
              <span className="text-xs text-muted-foreground">{m.institucion ?? "Institucion no indicada"}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{m.email}</span>
              <span className="text-xs text-muted-foreground">{m.telefono ?? "Sin telefono"}</span>
            </div>
            <span className="font-mono text-[13px]">{m.cedula_profesional}</span>
            <span className="truncate">{m.especialidad ?? "—"}</span>
            <span className="text-muted-foreground">{new Date(m.creado_en).toLocaleDateString("es-MX")}</span>
            <div className="flex flex-col gap-2 md:items-end">
              {m.estado !== "pendiente" && (
                <Estado tono={tonoDeValidacion(m.estado)} className="md:self-end" />
              )}
              {m.motivo_rechazo && <span className="text-xs text-[#b03535] md:text-right">{m.motivo_rechazo}</span>}
              <DecisionBotones
                estado={m.estado}
                rutaAprobar={`/admin/medicos/${m.usuario_id}/validar`}
                rutaRechazar={`/admin/medicos/${m.usuario_id}/rechazar`}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            {medicos.length} {medicos.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        </div>
      </div>
    </div>
  );
}
