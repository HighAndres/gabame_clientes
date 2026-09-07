import Link from "next/link";

import { Button } from "@/components/ui/button";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="mt-1 text-sm text-muted-foreground">{datos.total} en tu alcance.</p>
      </div>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <Input name="q" placeholder="Buscar por correo o nombre" defaultValue={q} className="max-w-xs" />
        <select
          name="rol"
          defaultValue={rol}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
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
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Correo</th>
              <th className="px-3 py-2">Realm</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Alta</th>
            </tr>
          </thead>
          <tbody>
            {datos.items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">
                  {u.nombre} {u.apellidos}
                  {!u.activo && <span className="ml-2 text-xs text-destructive">inactivo</span>}
                </td>
                <td className="px-3 py-2">
                  {u.email}
                  {!u.email_verificado && <span className="ml-2 text-xs text-muted-foreground">sin verificar</span>}
                </td>
                <td className="px-3 py-2">{u.realm}</td>
                <td className="px-3 py-2">
                  {u.roles.map((r) => `${r.rol}${r.empresa ? ` (${r.empresa})` : ""}`).join(", ")}
                </td>
                <td className="px-3 py-2">{u.estado_medico ?? u.estado_partner ?? "—"}</td>
                <td className="px-3 py-2">{u.origen_inicial}</td>
                <td className="px-3 py-2">{new Date(u.creado_en).toLocaleDateString("es-MX")}</td>
              </tr>
            ))}
            {datos.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Sin resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pagina > 1 && (
            <Link href={enlace(pagina - 1)} className="text-primary hover:underline">
              ← Anterior
            </Link>
          )}
          <span className="text-muted-foreground">
            Pagina {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <Link href={enlace(pagina + 1)} className="text-primary hover:underline">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
