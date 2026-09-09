"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NOMBRE_AUDIENCIA, type PublicacionOut } from "@/types/admin";
import type { Audiencia, Empresa } from "@/types/auth";

const selectClase = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";

/** Alta (con `empresa`) o edicion (con `publicacion`) de una publicacion del espacio. */
export function PublicacionForm({ empresa, publicacion }: { empresa: Empresa; publicacion?: PublicacionOut }) {
  const router = useRouter();
  const edicion = Boolean(publicacion);
  const [audiencia, setAudiencia] = useState<Audiencia>(publicacion?.audiencia ?? "partners");
  const [titulo, setTitulo] = useState(publicacion?.titulo ?? "");
  const [resumen, setResumen] = useState(publicacion?.resumen ?? "");
  const [contenido, setContenido] = useState(publicacion?.contenido ?? "");
  const [orden, setOrden] = useState(publicacion?.orden ?? 0);
  const [publicada, setPublicada] = useState(publicacion?.publicada ?? false);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEstado(null);
    setCargando(true);
    try {
      const res = await fetch(edicion ? `/api/backend/admin/publicaciones/${publicacion!.id}` : `/api/backend/admin/espacios/${empresa}/publicaciones`, {
        method: edicion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audiencia, titulo, resumen: resumen || null, contenido, orden, publicada }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setEstado({ tipo: "error", texto: d?.mensaje ?? "No se pudo guardar." });
        return;
      }
      setEstado({ tipo: "ok", texto: "Publicación guardada." });
      if (!edicion) {
        setTitulo("");
        setResumen("");
        setContenido("");
        setPublicada(false);
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  async function eliminar() {
    if (!publicacion || !window.confirm("¿Eliminar esta publicación? No se puede deshacer.")) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/backend/admin/publicaciones/${publicacion.id}`, { method: "DELETE" });
      if (!res.ok) {
        setEstado({ tipo: "error", texto: "No se pudo eliminar." });
        return;
      }
      router.push(`/admin/publicaciones?empresa=${empresa}`);
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px_90px]">
        <div className="space-y-1">
          <Label htmlFor="p-titulo">Título</Label>
          <Input id="p-titulo" required minLength={2} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-aud">Audiencia</Label>
          <select id="p-aud" className={selectClase} value={audiencia} onChange={(e) => setAudiencia(e.target.value as Audiencia)}>
            {(Object.keys(NOMBRE_AUDIENCIA) as Audiencia[]).map((a) => (
              <option key={a} value={a}>
                {NOMBRE_AUDIENCIA[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="p-orden">Orden</Label>
          <Input id="p-orden" type="number" min={0} max={999} value={orden} onChange={(e) => setOrden(Number(e.target.value) || 0)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-resumen">Resumen (opcional)</Label>
        <Input id="p-resumen" maxLength={500} value={resumen} onChange={(e) => setResumen(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="p-contenido">Contenido (markdown)</Label>
        <textarea
          id="p-contenido"
          className="min-h-[200px] w-full rounded-md border border-input bg-transparent p-2 font-mono text-xs"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={publicada} onChange={(e) => setPublicada(e.target.checked)} />
        Publicada (visible en el portal para su audiencia)
      </label>
      {estado && <p className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={cargando || titulo.trim().length < 2}>
          {edicion ? "Guardar cambios" : "Crear publicación"}
        </Button>
        {edicion && (
          <Button type="button" size="sm" variant="ghost" disabled={cargando} onClick={eliminar}>
            Eliminar
          </Button>
        )}
      </div>
    </form>
  );
}
