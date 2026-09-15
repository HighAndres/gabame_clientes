import Link from "next/link";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { buttonVariants } from "@/components/ui/button";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import type { VinculoAdminOut } from "@/types/admin";
import type { Empresa, EstadoValidacion } from "@/types/auth";
import { NOMBRE_SUBTIPO } from "@/types/partner";

const ESTADOS: { valor: EstadoValidacion; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "validado", texto: "Aprobados" },
  { valor: "rechazado", texto: "Rechazados" },
];

function primero(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Cola de vinculos de partners: una fila por empresa solicitada (ADR-0008). El backend filtra por alcance. */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  const alcance = u ? alcanceDe(u) : null;
  const estadoParam = primero(searchParams.estado);
  const estado = (ESTADOS.some((e) => e.valor === estadoParam) ? estadoParam : "pendiente") as EstadoValidacion;
  const empresasFiltro = alcance ? alcance.admin.length > 1 || alcance.grupo ? alcance.empresas : [] : [];
  const empresaParam = primero(searchParams.empresa);
  const empresa = empresasFiltro.includes(empresaParam as Empresa) ? (empresaParam as Empresa) : null;

  const query = new URLSearchParams({ estado });
  if (empresa) query.set("empresa", empresa);
  const vinculos = await apiConSesion<VinculoAdminOut[]>(`/admin/partners?${query.toString()}`);
  const ambito = alcance?.grupo ? "Todo el grupo" : alcance?.admin.map((e) => NOMBRE_EMPRESA[e]).join(", ");
  const enlace = (e: EstadoValidacion, emp: Empresa | null) => `/admin/partners?estado=${e}${emp ? `&empresa=${emp}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{ambito} · Partners</p>
          <h1 className="text-[26px] font-bold">Solicitudes de vínculo</h1>
        </div>
        <nav className="flex gap-2 text-[13px]" aria-label="Filtrar por estado">
          {ESTADOS.map((e) => (
            <Link
              key={e.valor}
              href={enlace(e.valor, empresa)}
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

      {empresasFiltro.length > 0 && (
        <nav className="flex flex-wrap gap-2 text-[13px]" aria-label="Filtrar por empresa">
          <Link
            href={enlace(estado, null)}
            aria-current={empresa === null ? "page" : undefined}
            className={cn("rounded-full px-3 py-1", empresa === null ? "bg-primary-soft font-bold text-primary-soft-foreground" : "text-muted-foreground hover:text-heading")}
          >
            Todas
          </Link>
          {empresasFiltro.map((e) => (
            <Link
              key={e}
              href={enlace(estado, e)}
              aria-current={empresa === e ? "page" : undefined}
              className={cn("rounded-full px-3 py-1", empresa === e ? "bg-primary-soft font-bold text-primary-soft-foreground" : "text-muted-foreground hover:text-heading")}
            >
              {NOMBRE_EMPRESA[e]}
            </Link>
          ))}
        </nav>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_130px_120px_110px_220px] bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
          <span>Razón social</span>
          <span>Contacto</span>
          <span>Tipo</span>
          <span>Documentos</span>
          <span>Solicitud</span>
          <span />
        </div>
        {vinculos.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nadie en este estado.</p>}
        {vinculos.map((v) => (
          <div
            key={v.vinculo_id}
            className="grid items-center gap-3 border-t px-5 py-3.5 text-sm md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_130px_120px_110px_220px]"
          >
            <div className="flex min-w-0 flex-col">
              <Link href={`/admin/partners/${v.usuario_id}`} className="truncate font-bold hover:text-primary">
                {v.razon_social}
              </Link>
              <span className="text-xs text-muted-foreground">Vinculo con {NOMBRE_EMPRESA[v.empresa]}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate">
                {v.nombre} {v.apellidos}
              </span>
              <span className="truncate text-xs text-muted-foreground">{v.email}</span>
            </div>
            <span>{NOMBRE_SUBTIPO[v.tipo]}</span>
            <Link href={`/admin/partners/${v.usuario_id}`} className="font-bold text-primary hover:text-primary-hover">
              {v.documentos} {v.documentos === 1 ? "archivo" : "archivos"}
            </Link>
            <span className="text-muted-foreground">{new Date(v.creado_en).toLocaleDateString("es-MX")}</span>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {v.estado !== "pendiente" && <Estado tono={tonoDeValidacion(v.estado)} />}
              <Link href={`/admin/partners/${v.usuario_id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Revisar
              </Link>
              {v.estado === "pendiente" && (
                <DecisionBotones
                  estado={v.estado}
                  rutaAprobar={`/admin/vinculos/${v.vinculo_id}/aprobar`}
                  rutaRechazar={`/admin/vinculos/${v.vinculo_id}/rechazar`}
                />
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            {vinculos.length} {vinculos.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        </div>
      </div>
    </div>
  );
}
