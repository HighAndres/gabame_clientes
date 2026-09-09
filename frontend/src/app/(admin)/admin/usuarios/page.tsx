import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { Input } from "@/components/ui/input";
import { NOMBRE_ROL } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PaginaUsuarios } from "@/types/admin";
import type { Rol } from "@/types/auth";

const ROLES: Rol[] = ["paciente", "medico", "partner", "admin_empresa", "admin_grupo"];
const POR_PAGINA = 25;

/** Usuarios dentro del alcance del admin. El backend aplica la matriz (ADR-0004). */
export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const rol = ROLES.includes(searchParams.rol as Rol) ? (searchParams.rol as Rol) : "";
  const pagina = Math.max(1, Number(searchParams.pagina ?? 1) || 1);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">Usuarios</p>
        <h1 className="text-[26px] font-bold">Usuarios en tu alcance</h1>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <form className="flex flex-wrap items-center gap-2 border-b px-5 py-3.5" method="get">
          <Input name="q" placeholder="Buscar por correo o nombre" defaultValue={q} className="max-w-xs" aria-label="Buscar" />
          <select
            name="rol"
            defaultValue={rol}
            aria-label="Rol"
            className="flex h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_ROL[r]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filtrar
          </Button>
          <span className="ml-auto text-[13px] text-muted-foreground">{datos.total} en total</span>
        </form>

        <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_90px_minmax(0,1.2fr)_110px_110px_90px] bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
          <span>Nombre</span>
          <span>Correo</span>
          <span>Realm</span>
          <span>Roles</span>
          <span>Estado</span>
          <span>Origen</span>
          <span>Alta</span>
        </div>
        {datos.items.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin resultados.</p>}
        {datos.items.map((u) => {
          const estado = u.estado_medico ?? u.estado_partner;
          return (
            <div
              key={u.id}
              className="grid items-center gap-2 border-t px-5 py-3 text-sm md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_90px_minmax(0,1.2fr)_110px_110px_90px]"
            >
              <span className="truncate font-bold">
                {u.nombre} {u.apellidos}
                {!u.activo && <span className="ml-2 text-xs font-normal text-destructive">inactivo</span>}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{u.email}</span>
                {!u.email_verificado && <span className="text-xs text-muted-foreground">sin verificar</span>}
              </span>
              <span className="text-muted-foreground">{u.realm}</span>
              <span className="truncate text-muted-foreground">
                {u.roles.map((r) => `${NOMBRE_ROL[r.rol]}${r.empresa ? ` (${r.empresa})` : ""}`).join(", ")}
              </span>
              <span>{estado ? <Estado tono={tonoDeValidacion(estado)} /> : <span className="text-muted-foreground">—</span>}</span>
              <span className="text-muted-foreground">{u.origen_inicial}</span>
              <span className="text-muted-foreground">{new Date(u.creado_en).toLocaleDateString("es-MX")}</span>
            </div>
          );
        })}

        <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            Pagina {pagina} de {paginas}
          </span>
          <span className="flex gap-4">
            {pagina > 1 && (
              <Link href={enlace(pagina - 1)} className="font-bold text-primary hover:text-primary-hover">
                ← Anterior
              </Link>
            )}
            {pagina < paginas && (
              <Link href={enlace(pagina + 1)} className="font-bold text-primary hover:text-primary-hover">
                Siguiente →
              </Link>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
