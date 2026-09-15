"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Alta de area terapeutica (admin de contenido). Nace sin publicar. */
export function AreaForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orden, setOrden] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/backend/admin/contenido/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, descripcion: descripcion || null, orden, publicada: false }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo crear el area.");
        return;
      }
      setNombre("");
      setDescripcion("");
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[2fr,3fr,auto,auto] sm:items-end" noValidate>
      <div className="space-y-1">
        <Label htmlFor="area-nombre">Nueva área terapéutica</Label>
        <Input id="area-nombre" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="area-desc">Descripción (opcional)</Label>
        <Input id="area-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="area-orden">Orden</Label>
        <Input id="area-orden" type="number" min={0} max={999} className="w-20" value={orden} onChange={(e) => setOrden(Number(e.target.value) || 0)} />
      </div>
      <Button type="submit" size="sm" disabled={cargando || nombre.trim().length < 2}>
        Crear
      </Button>
      {error && <p className="text-xs text-destructive sm:col-span-4">{error}</p>}
    </form>
  );
}
