"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UsuarioOut } from "@/types/auth";

/**
 * Edita nombre, apellidos y telefono via el route handler de Next (que agrega el token).
 * El email es de solo lectura: cambiarlo exige re-verificacion y ese flujo no entra en Fase 2.
 */
export function PerfilForm({ usuario }: { usuario: UsuarioOut }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    telefono: usuario.telefono ?? "",
  });
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEstado(null);
    setCargando(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, telefono: f.telefono || null }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        setEstado({ tipo: "error", texto: cuerpo?.detail?.mensaje ?? "No se pudo guardar." });
        return;
      }
      setEstado({ tipo: "ok", texto: "Datos guardados." });
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="max-w-md space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <Input id="email" value={usuario.email} readOnly disabled />
        <p className="text-xs text-muted-foreground">
          Para cambiar tu correo, contacta a soporte.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input
            id="apellidos"
            required
            value={f.apellidos}
            onChange={(e) => setF({ ...f, apellidos: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Telefono</Label>
        <Input id="telefono" type="tel" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
      </div>
      {estado && <Aviso tipo={estado.tipo}>{estado.texto}</Aviso>}
      <Button type="submit" disabled={cargando}>
        {cargando ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
