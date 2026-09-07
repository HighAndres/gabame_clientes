"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FichaOut } from "@/types/contenido";

/**
 * Alta (con `areaId`) o edicion (con `ficha`) de una ficha tecnica.
 * # Pendiente 0.5 — el contenido es markdown libre hasta que el cliente defina campos.
 */
export function FichaForm({ areaId, ficha }: { areaId?: string; ficha?: FichaOut }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(ficha?.nombre ?? "");
  const [resumen, setResumen] = useState(ficha?.resumen ?? "");
  const [contenido, setContenido] = useState(ficha?.contenido ?? "");
  const [publicada, setPublicada] = useState(ficha?.publicada ?? false);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const edicion = Boolean(ficha);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado(null);
    setCargando(true);
    try {
      const res = await fetch(edicion ? `/api/backend/admin/contenido/fichas/${ficha!.id}` : "/api/backend/admin/contenido/fichas", {
        method: edicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(edicion ? {} : { area_id: areaId }),
          nombre,
          resumen: resumen || null,
          contenido,
          publicada,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setEstado({ tipo: "error", texto: d?.mensaje ?? "No se pudo guardar la ficha." });
        return;
      }
      setEstado({ tipo: "ok", texto: "Ficha guardada." });
      if (!edicion) {
        setNombre("");
        setResumen("");
        setContenido("");
        setPublicada(false);
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="f-nombre">Nombre del producto</Label>
          <Input id="f-nombre" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-resumen">Resumen (opcional)</Label>
          <Input id="f-resumen" maxLength={500} value={resumen} onChange={(e) => setResumen(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="f-contenido">Contenido (markdown)</Label>
        <textarea
          id="f-contenido"
          className="min-h-[220px] w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder={"# Presentacion\n\n...\n\n## Indicaciones\n\n..."}
        />
        <p className="text-xs text-muted-foreground">
          Pendiente 0.5: cuando el cliente defina la estructura de la ficha, estos campos se formalizan.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} />
        Publicada (visible para medicos validados)
      </label>
      {estado && <p className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</p>}
      <Button type="submit" size="sm" disabled={cargando || nombre.trim().length < 2}>
        {edicion ? "Guardar cambios" : "Crear ficha"}
      </Button>
    </form>
  );
}
