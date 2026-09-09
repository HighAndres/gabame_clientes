"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { RolesMatriz } from "@/components/admin/roles-matriz";
import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminNuevoIn, RolAsignado, UsuarioAdminOut } from "@/types/admin";
import type { Empresa } from "@/types/auth";

/** Alta de admin o editor. La persona recibe por correo el enlace para fijar su contrasena. */
export function NuevoAdminForm({ grupo, empresas }: { grupo: boolean; empresas: Empresa[] }) {
  const router = useRouter();
  const [f, setF] = useState({ email: "", nombre: "", apellidos: "" });
  const [roles, setRoles] = useState<RolAsignado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [creado, setCreado] = useState<UsuarioAdminOut | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (roles.length === 0) {
      setError("Elige al menos un rol.");
      return;
    }
    const datos: AdminNuevoIn = { ...f, roles };
    setCargando(true);
    try {
      const res = await fetch("/api/backend/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo crear la cuenta.");
        return;
      }
      setCreado((await res.json()) as UsuarioAdminOut);
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  if (creado) {
    return (
      <Aviso tipo="ok" titulo="Cuenta creada">
        Enviamos a <strong>{creado.email}</strong> un enlace para establecer su contraseña. Con ese enlace confirma su
        correo y entra al panel.
      </Aviso>
    );
  }

  return (
    <form onSubmit={enviar} className="flex max-w-2xl flex-col gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="na-nombre">Nombre</Label>
          <Input id="na-nombre" required value={f.nombre} onChange={set("nombre")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="na-apellidos">Apellidos</Label>
          <Input id="na-apellidos" required value={f.apellidos} onChange={set("apellidos")} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="na-email">Correo electrónico</Label>
        <Input id="na-email" type="email" required value={f.email} onChange={set("email")} />
      </div>
      <div className="space-y-1.5">
        <Label>Roles</Label>
        <RolesMatriz grupo={grupo} empresas={empresas} value={roles} onChange={setRoles} />
      </div>
      {error && <Aviso>{error}</Aviso>}
      <div>
        <Button type="submit" disabled={cargando || !f.email || !f.nombre || !f.apellidos}>
          {cargando ? "Creando..." : "Crear cuenta"}
        </Button>
      </div>
    </form>
  );
}
