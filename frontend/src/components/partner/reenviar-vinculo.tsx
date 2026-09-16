"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { enviarJson, mensajeDeError } from "@/lib/peticion";
import type { SubtipoPartner } from "@/types/auth";
import { NOMBRE_SUBTIPO } from "@/types/partner";

const selectClase = "flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm";

/**
 * Tras un rechazo, volver a la cola de esa empresa (ADR-0014). Antes el backend respondia "ya
 * tienes un vinculo con esa empresa" y no habia salida. Se puede corregir el tipo de relacion;
 * los documentos se corrigen en su tabla, que es la misma para todas las empresas.
 */
export function ReenviarVinculo({
  vinculoId,
  empresaNombre,
  tipoActual,
}: {
  vinculoId: string;
  empresaNombre: string;
  tipoActual: SubtipoPartner;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<SubtipoPartner>(tipoActual);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function reenviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await enviarJson(`/api/backend/partners/me/vinculos/${vinculoId}/reenviar`, "POST", {
        tipo: tipo === tipoActual ? undefined : tipo,
      });
      if (!res.ok) {
        setError(await mensajeDeError(res, "No se pudo enviar la solicitud."));
        return;
      }
      setAbierto(false);
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <Button size="sm" variant="outline" className="self-start" onClick={() => setAbierto(true)}>
        Volver a solicitar
      </Button>
    );
  }

  return (
    <form onSubmit={reenviar} className="flex flex-col gap-3 rounded-md border bg-background p-3">
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Revisa primero tus documentos más abajo: {empresaNombre} volverá a revisar tu solicitud con lo que tengas cargado.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor={`tipo-${vinculoId}`}>Tipo de relación</Label>
        <select
          id={`tipo-${vinculoId}`}
          className={selectClase}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as SubtipoPartner)}
        >
          {(Object.keys(NOMBRE_SUBTIPO) as SubtipoPartner[]).map((s) => (
            <option key={s} value={s}>
              {NOMBRE_SUBTIPO[s]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={cargando}>
          {cargando ? "Enviando..." : "Enviar de nuevo"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={cargando} onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
