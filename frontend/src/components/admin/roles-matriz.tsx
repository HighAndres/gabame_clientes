"use client";

import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import type { RolAsignado } from "@/types/admin";
import type { Empresa, Rol } from "@/types/auth";

/**
 * Casillas de roles administrativos dentro del alcance del actor: por cada empresa que
 * administra, "Administrador" y "Editor"; si es admin del grupo, tambien "Administrador del grupo".
 * Los roles fuera del alcance no se muestran ni se tocan (el backend los conserva).
 */
export function RolesMatriz({
  grupo,
  empresas,
  value,
  onChange,
}: {
  grupo: boolean;
  empresas: Empresa[];
  value: RolAsignado[];
  onChange: (roles: RolAsignado[]) => void;
}) {
  const tiene = (rol: Rol, empresa: Empresa | null) => value.some((r) => r.rol === rol && r.empresa === empresa);
  const alternar = (rol: Rol, empresa: Empresa | null) => {
    onChange(tiene(rol, empresa) ? value.filter((r) => !(r.rol === rol && r.empresa === empresa)) : [...value, { rol, empresa }]);
  };

  return (
    <div className="overflow-hidden rounded-md border text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_130px_130px] bg-background px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
        <span>Empresa</span>
        <span>Administrador</span>
        <span>Editor</span>
      </div>
      {empresas.map((e) => (
        <div key={e} className="grid grid-cols-[minmax(0,1fr)_130px_130px] items-center border-t px-3 py-2">
          <span className="font-bold">{NOMBRE_EMPRESA[e]}</span>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={tiene("admin_empresa", e)} onChange={() => alternar("admin_empresa", e)} />
            <span className="sr-only">Administrador de {NOMBRE_EMPRESA[e]}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={tiene("editor_empresa", e)} onChange={() => alternar("editor_empresa", e)} />
            <span className="sr-only">Editor de {NOMBRE_EMPRESA[e]}</span>
          </label>
        </div>
      ))}
      {grupo && (
        <label className="flex items-center gap-2 border-t px-3 py-2">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={tiene("admin_grupo", null)} onChange={() => alternar("admin_grupo", null)} />
          <span className="font-bold">Administrador del grupo</span>
          <span className="text-xs text-muted-foreground">(ve y administra todas las empresas)</span>
        </label>
      )}
    </div>
  );
}
