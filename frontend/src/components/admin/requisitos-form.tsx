"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RequisitoDocumentalIn, RequisitoDocumentalOut } from "@/types/admin";
import type { Empresa, SubtipoPartner } from "@/types/auth";
import { NOMBRE_SUBTIPO } from "@/types/partner";

type Fila = RequisitoDocumentalIn & { _id: string };

const selectClase = "flex h-9 rounded-md border border-input bg-transparent px-2 text-sm";

/**
 * Requisitos documentales de una empresa (resuelve 0.4 como dato). Lo que se quita se desactiva
 * en el backend, no se borra: los documentos ya cargados conservan su etiqueta.
 */
export function RequisitosForm({ empresa, iniciales, habilitado }: { empresa: Empresa; iniciales: RequisitoDocumentalOut[]; habilitado: boolean }) {
  const router = useRouter();
  const [filas, setFilas] = useState<Fila[]>(
    iniciales.filter((r) => r.activo).map((r) => ({ _id: r.id, clave: r.clave, nombre: r.nombre, descripcion: r.descripcion, obligatorio: r.obligatorio, tipo: r.tipo })),
  );
  const inactivos = iniciales.filter((r) => !r.activo);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  const cambiar = (i: number, cambios: Partial<Fila>) => setFilas(filas.map((f, j) => (j === i ? { ...f, ...cambios } : f)));

  async function guardar() {
    setEstado(null);
    setCargando(true);
    try {
      const res = await fetch(`/api/backend/admin/espacios/${empresa}/requisitos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitos: filas.map(({ _id, ...r }) => ({ ...r, descripcion: r.descripcion || null, tipo: r.tipo || null })),
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setEstado({ tipo: "error", texto: d?.mensaje ?? "No se pudo guardar." });
        return;
      }
      setEstado({ tipo: "ok", texto: "Requisitos guardados." });
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold">Documentos que pides a tus partners</h3>
        {!habilitado && <span className="text-xs text-warning">El módulo de documentos está apagado en este espacio.</span>}
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[720px] overflow-hidden rounded-md border text-sm">
          <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_170px_100px_40px] gap-2 bg-background px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
            <span>Documento</span>
            <span>Indicación</span>
            <span>Aplica a</span>
            <span>Obligatorio</span>
            <span />
          </div>
          {filas.map((f, i) => (
            <div key={f._id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)_170px_100px_40px] items-center gap-2 border-t px-3 py-2">
              <Input aria-label="Nombre del documento" value={f.nombre} onChange={(e) => cambiar(i, { nombre: e.target.value })} />
              <Input aria-label="Indicación" value={f.descripcion ?? ""} onChange={(e) => cambiar(i, { descripcion: e.target.value })} />
              <select aria-label="Aplica a" className={selectClase} value={f.tipo ?? ""} onChange={(e) => cambiar(i, { tipo: (e.target.value || null) as SubtipoPartner | null })}>
                <option value="">Todos los tipos</option>
                {(Object.keys(NOMBRE_SUBTIPO) as SubtipoPartner[]).map((s) => (
                  <option key={s} value={s}>
                    {NOMBRE_SUBTIPO[s]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={f.obligatorio} onChange={(e) => cambiar(i, { obligatorio: e.target.checked })} />
                <span className="sr-only">Obligatorio</span>
              </label>
              <button type="button" aria-label="Quitar" className="text-muted-foreground hover:text-destructive" onClick={() => setFilas(filas.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      {inactivos.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Retirados (los documentos ya cargados conservan su etiqueta): {inactivos.map((r) => r.nombre).join(", ")}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="sm" variant="outline" onClick={() => setFilas([...filas, { _id: `n${Date.now()}`, nombre: "", descripcion: "", obligatorio: true, tipo: null }])}>
          <Plus className="mr-1 h-4 w-4" /> Agregar documento
        </Button>
        <Button type="button" size="sm" disabled={cargando || !habilitado || filas.some((f) => f.nombre.trim().length < 2)} onClick={guardar}>
          Guardar requisitos
        </Button>
        {estado && <span className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</span>}
      </div>
    </div>
  );
}
