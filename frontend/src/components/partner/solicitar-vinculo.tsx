"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import type { Empresa, SubtipoPartner } from "@/types/auth";
import { NOMBRE_SUBTIPO } from "@/types/partner";

const selectClase =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** Pide relacion con otra empresa del grupo. Nace en revision; la aprueba el admin de esa empresa. */
export function SolicitarVinculo({ disponibles }: { disponibles: Empresa[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa>(disponibles[0]);
  const [tipo, setTipo] = useState<SubtipoPartner>("distribuidor");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (disponibles.length === 0) return null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch("/api/backend/partners/me/vinculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, tipo }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo enviar la solicitud.");
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
      <Button variant="outline" size="sm" onClick={() => setAbierto(true)}>
        Trabajar con otra empresa del grupo
      </Button>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <div className="min-w-[180px] space-y-1.5">
        <Label htmlFor="vinculo-empresa">Empresa</Label>
        <select id="vinculo-empresa" className={selectClase} value={empresa} onChange={(e) => setEmpresa(e.target.value as Empresa)}>
          {disponibles.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_EMPRESA[e]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[200px] space-y-1.5">
        <Label htmlFor="vinculo-tipo">Tipo de relación</Label>
        <select id="vinculo-tipo" className={selectClase} value={tipo} onChange={(e) => setTipo(e.target.value as SubtipoPartner)}>
          {(Object.keys(NOMBRE_SUBTIPO) as SubtipoPartner[]).map((s) => (
            <option key={s} value={s}>
              {NOMBRE_SUBTIPO[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={cargando}>
          {cargando ? "Enviando..." : "Enviar solicitud"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={cargando} onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </form>
  );
}
