import { Users } from "lucide-react";
import Link from "next/link";

import { BarraFiltros } from "@/components/admin/barra-filtros";
import { Celda, FilaTabla, Paginacion, Tabla } from "@/components/admin/tabla";
import { buttonVariants } from "@/components/ui/button";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { fecha } from "@/lib/fechas";
import { NOMBRE_EMPRESA, NOMBRE_ROL } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import type { PaginaUsuarios } from "@/types/admin";
import type { Rol } from "@/types/auth";

const ROLES: Rol[] = ["paciente", "medico", "partner", "admin_empresa", "editor_empresa", "admin_grupo"];
const POR_PAGINA = 25;
const COLUMNAS = "minmax(0,1.2fr) minmax(0,1.4fr) minmax(0,1.4fr) 110px 90px";

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Usuarios dentro del alcance del admin. El backend aplica la matriz (ADR-0004). */
export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = texto(searchParams.q);
  const rolParam = texto(searchParams.rol);
  const rol = ROLES.includes(rolParam as Rol) ? (rolParam as Rol) : "";
  const pagina = Math.max(1, Number(texto(searchParams.pagina)) || 1);

  const params = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
  if (q) params.set("q", q);
  if (rol) params.set("rol", rol);
  const datos = await apiConSesion<PaginaUsuarios>(`/admin/usuarios?${params}`);
  const paginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA));

  const enlace = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (rol) s.set("rol", rol);
    s.set("pagina", String(p));
    return `/admin/usuarios?${s}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoArea
        icono={Users}
        etiqueta="Usuarios"
        titulo="Usuarios en tu alcance"
        acciones={
          <Link href="/admin/usuarios/nuevo" className={cn(buttonVariants({ size: "sm" }))}>
            Nuevo administrador
          </Link>
        }
      />

      <BarraFiltros
        accion="/admin/usuarios"
        busqueda={{ nombre: "q", valor: q, placeholder: "Correo o nombre" }}
        selects={[
          {
            nombre: "rol",
            etiqueta: "Rol",
            valor: rol,
            opciones: [{ valor: "", texto: "Todos los roles" }, ...ROLES.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }))],
          },
        ]}
      />

      <Tabla
        columnas={COLUMNAS}
        cabeceras={["Nombre", "Correo", "Roles", "Estado", "Alta"]}
        cantidad={datos.items.length}
        vacio={q || rol ? "Nadie coincide con los filtros." : "Sin usuarios en tu alcance."}
        pie={
          <Paginacion
            resumen={`${datos.total} ${datos.total === 1 ? "usuario" : "usuarios"}`}
            pagina={pagina}
            paginas={paginas}
            enlace={enlace}
          />
        }
      >
        {datos.items.map((u) => {
          const estado = u.estado_medico ?? u.estado_partner;
          return (
            <FilaTabla key={u.id} atenuada={!u.activo}>
              <Celda>
                <Link href={`/admin/usuarios/${u.id}`} className="truncate font-bold text-heading hover:text-primary">
                  {u.nombre} {u.apellidos}
                </Link>
                {!u.activo && <span className="text-xs text-destructive">Cuenta desactivada</span>}
              </Celda>
              <Celda etiqueta="Correo">
                <span className="truncate">{u.email}</span>
                {/* Quien se registro y no confirmo su correo no puede entrar: es lo primero que se busca en soporte. */}
                {!u.email_verificado && <span className="text-xs text-muted-foreground">Correo sin verificar</span>}
              </Celda>
              <Celda etiqueta="Roles">
                <span className="truncate text-muted-foreground">
                  {u.roles.map((r) => `${NOMBRE_ROL[r.rol]}${r.empresa ? ` · ${NOMBRE_EMPRESA[r.empresa]}` : ""}`).join(", ")}
                </span>
              </Celda>
              <Celda etiqueta="Estado">
                {estado ? <Estado tono={tonoDeValidacion(estado)} className="self-start" /> : <span className="text-muted-foreground">—</span>}
              </Celda>
              <Celda etiqueta="Alta">
                <span className="text-muted-foreground">{fecha(u.creado_en)}</span>
              </Celda>
            </FilaTabla>
          );
        })}
      </Tabla>
    </div>
  );
}
