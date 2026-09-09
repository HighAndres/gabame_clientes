"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RolesMatriz } from "@/components/admin/roles-matriz";
import { Button } from "@/components/ui/button";
import type { RolAsignado, UsuarioAdminOut } from "@/types/admin";
import type { Empresa } from "@/types/auth";

const ADMINISTRABLES = new Set(["admin_grupo", "admin_empresa", "editor_empresa"]);

async function llamar(ruta: string, method: string, cuerpo?: unknown): Promise<string | null> {
  const res = await fetch(`/api/backend${ruta}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (res.ok) return null;
  const d = (await res.json().catch(() => null))?.detail;
  return d?.mensaje ?? "No se pudo aplicar el cambio.";
}

/** Roles administrativos del usuario (dentro del alcance del actor). */
export function RolesForm({ usuario, grupo, empresas }: { usuario: UsuarioAdminOut; grupo: boolean; empresas: Empresa[] }) {
  const router = useRouter();
  const visibles = (r: RolAsignado) =>
    ADMINISTRABLES.has(r.rol) && (r.rol === "admin_grupo" ? grupo : r.empresa !== null && empresas.includes(r.empresa));
  const iniciales = usuario.roles.filter(visibles);
  const [roles, setRoles] = useState<RolAsignado[]>(iniciales);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setEstado(null);
    setCargando(true);
    try {
      const error = await llamar(`/admin/usuarios/${usuario.id}/roles`, "PUT", { roles });
      setEstado(error ? { tipo: "error", texto: error } : { tipo: "ok", texto: "Roles guardados." });
      if (!error) router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <RolesMatriz grupo={grupo} empresas={empresas} value={roles} onChange={setRoles} />
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={guardar} disabled={cargando}>
          Guardar roles
        </Button>
        {estado && <span className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</span>}
      </div>
    </div>
  );
}

/** Activar/desactivar y enviar enlace de restablecimiento. */
export function AccionesUsuario({ usuario, esYo }: { usuario: UsuarioAdminOut; esYo: boolean }) {
  const router = useRouter();
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ejecutar(fn: () => Promise<string | null>, ok: string) {
    setEstado(null);
    setCargando(true);
    try {
      const error = await fn();
      setEstado(error ? { tipo: "error", texto: error } : { tipo: "ok", texto: ok });
      if (!error) router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={cargando}
        onClick={() => ejecutar(() => llamar(`/admin/usuarios/${usuario.id}/restablecer`, "POST"), "Enlace enviado por correo.")}
      >
        Enviar restablecimiento de contraseña
      </Button>
      {!esYo && (
        <Button
          size="sm"
          variant={usuario.activo ? "destructive" : "default"}
          disabled={cargando}
          onClick={() =>
            ejecutar(
              () => llamar(`/admin/usuarios/${usuario.id}/activo`, "PATCH", { activo: !usuario.activo }),
              usuario.activo ? "Cuenta desactivada; sus sesiones se cerraron." : "Cuenta reactivada.",
            )
          }
        >
          {usuario.activo ? "Desactivar cuenta" : "Reactivar cuenta"}
        </Button>
      )}
      {estado && <span className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</span>}
    </div>
  );
}
