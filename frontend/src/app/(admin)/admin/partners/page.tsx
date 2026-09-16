import { Briefcase } from "lucide-react";
import Link from "next/link";

import { BarraFiltros, type SelectFiltro } from "@/components/admin/barra-filtros";
import { DecisionBotones } from "@/components/admin/decision-botones";
import { Celda, FilaTabla, Tabla } from "@/components/admin/tabla";
import { buttonVariants } from "@/components/ui/button";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { fecha } from "@/lib/fechas";
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

const COLUMNAS = "minmax(0,1.5fr) minmax(0,1.3fr) 110px 90px 96px 250px";

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Cola de vinculos de partners: una fila por empresa solicitada (ADR-0008). El backend filtra por alcance. */
export default async function AdminPartnersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  const alcance = u ? alcanceDe(u) : null;
  const estadoParam = texto(searchParams.estado);
  const estado = (ESTADOS.some((e) => e.valor === estadoParam) ? estadoParam : "pendiente") as EstadoValidacion;
  // El filtro por empresa solo tiene sentido para quien administra mas de una.
  const empresasFiltro = alcance && (alcance.grupo || alcance.admin.length > 1) ? alcance.empresas : [];
  const empresaParam = texto(searchParams.empresa);
  const empresa = empresasFiltro.includes(empresaParam as Empresa) ? (empresaParam as Empresa) : null;
  const buscar = texto(searchParams.buscar);

  const query = new URLSearchParams({ estado });
  if (empresa) query.set("empresa", empresa);
  if (buscar) query.set("buscar", buscar);
  const vinculos = await apiConSesion<VinculoAdminOut[]>(`/admin/partners?${query}`);
  const ambito = alcance?.grupo ? "Todo el grupo" : alcance?.admin.map((e) => NOMBRE_EMPRESA[e]).join(", ");

  const selects: SelectFiltro[] = [
    { nombre: "estado", etiqueta: "Estado", valor: estado, opciones: ESTADOS },
  ];
  if (empresasFiltro.length > 0) {
    selects.push({
      nombre: "empresa",
      etiqueta: "Empresa",
      valor: empresa ?? "",
      opciones: [{ valor: "", texto: "Todas las empresas" }, ...empresasFiltro.map((e) => ({ valor: e, texto: NOMBRE_EMPRESA[e] }))],
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoArea icono={Briefcase} etiqueta={`${ambito} · Partners`} titulo="Solicitudes de vínculo" />

      <BarraFiltros
        accion="/admin/partners"
        busqueda={{ nombre: "buscar", valor: buscar, placeholder: "Razón social, RFC, nombre o correo" }}
        selects={selects}
      />

      <Tabla
        columnas={COLUMNAS}
        cabeceras={["Razón social", "Contacto", "Tipo", "Archivos", "Solicitud", ""]}
        cantidad={vinculos.length}
        vacio={buscar ? "Nadie coincide con la búsqueda." : "Nadie en este estado."}
        pie={<span>{vinculos.length} {vinculos.length === 1 ? "solicitud" : "solicitudes"}</span>}
      >
        {vinculos.map((v) => (
          <FilaTabla key={v.vinculo_id}>
            <Celda>
              <Link href={`/admin/partners/${v.usuario_id}`} className="truncate font-bold hover:text-primary">
                {v.razon_social}
              </Link>
              <span className="truncate text-xs text-muted-foreground">
                Vínculo con {NOMBRE_EMPRESA[v.empresa]}
                {v.rfc ? ` · ${v.rfc}` : ""}
              </span>
            </Celda>
            <Celda etiqueta="Contacto">
              <span className="truncate">
                {v.nombre} {v.apellidos}
              </span>
              <span className="truncate text-xs text-muted-foreground">{v.email}</span>
            </Celda>
            <Celda etiqueta="Tipo">
              <span>{NOMBRE_SUBTIPO[v.tipo]}</span>
            </Celda>
            <Celda etiqueta="Archivos">
              <span className={v.documentos === 0 ? "text-muted-foreground" : undefined}>{v.documentos}</span>
            </Celda>
            <Celda etiqueta="Solicitud">
              <span className="text-muted-foreground">{fecha(v.creado_en)}</span>
            </Celda>
            <Celda className="pt-1 xl:pt-0">
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                {v.estado !== "pendiente" && <Estado tono={tonoDeValidacion(v.estado)} />}
                <Link
                  href={`/admin/partners/${v.usuario_id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
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
            </Celda>
          </FilaTabla>
        ))}
      </Tabla>
    </div>
  );
}
