import Link from "next/link";

import { DecisionBotones } from "@/components/admin/decision-botones";
import { buttonVariants } from "@/components/ui/button";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { alcanceDe } from "@/lib/matriz-roles";
import { cn } from "@/lib/utils";
import type { PartnerAdminOut } from "@/types/admin";
import type { EstadoValidacion } from "@/types/auth";

const ESTADOS: { valor: EstadoValidacion; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "validado", texto: "Aprobados" },
  { valor: "rechazado", texto: "Rechazados" },
];
const SUBTIPO = { distribuidor: "Distribuidor", mayorista: "Mayorista", institucional: "Institucional" };

/** Solicitudes de vinculo de partners (lienzo aprobado). El backend filtra por empresa (ADR-0004). */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  const alcance = u ? alcanceDe(u) : null;
  const estado = (ESTADOS.some((e) => e.valor === searchParams.estado) ? searchParams.estado : "pendiente") as EstadoValidacion;
  const partners = await apiConSesion<PartnerAdminOut[]>(`/admin/partners?estado=${estado}`);
  const ambito = alcance?.grupo ? "Todo el grupo" : alcance?.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{ambito} · Partners</p>
          <h1 className="text-[26px] font-bold">Solicitudes de vinculo</h1>
        </div>
        <nav className="flex gap-2 text-[13px]" aria-label="Filtrar por estado">
          {ESTADOS.map((e) => (
            <Link
              key={e.valor}
              href={`/admin/partners?estado=${e.valor}`}
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
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_130px_120px_110px_220px] bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
          <span>Razon social</span>
          <span>Contacto</span>
          <span>Tipo</span>
          <span>Documentos</span>
          <span>Solicitud</span>
          <span />
        </div>
        {partners.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nadie en este estado.</p>}
        {partners.map((p) => (
          <div
            key={p.usuario_id}
            className="grid items-center gap-3 border-t px-5 py-3.5 text-sm md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_130px_120px_110px_220px]"
          >
            <div className="flex min-w-0 flex-col">
              <Link href={`/admin/partners/${p.usuario_id}`} className="truncate font-bold hover:text-primary">
                {p.razon_social}
              </Link>
              <span className="text-xs text-muted-foreground">{NOMBRE_EMPRESA[p.empresa_objetivo]}</span>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate">
                {p.nombre} {p.apellidos}
              </span>
              <span className="truncate text-xs text-muted-foreground">{p.email}</span>
            </div>
            <span>{SUBTIPO[p.subtipo]}</span>
            <Link href={`/admin/partners/${p.usuario_id}`} className="font-bold text-primary hover:text-primary-hover">
              {p.documentos} {p.documentos === 1 ? "archivo" : "archivos"}
            </Link>
            <span className="text-muted-foreground">{new Date(p.creado_en).toLocaleDateString("es-MX")}</span>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {p.estado !== "pendiente" && <Estado tono={tonoDeValidacion(p.estado)} />}
              <Link href={`/admin/partners/${p.usuario_id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Revisar
              </Link>
              {p.estado === "pendiente" && (
                <DecisionBotones
                  estado={p.estado}
                  rutaAprobar={`/admin/partners/${p.usuario_id}/aprobar`}
                  rutaRechazar={`/admin/partners/${p.usuario_id}/rechazar`}
                />
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            {partners.length} {partners.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        </div>
      </div>
    </div>
  );
}
