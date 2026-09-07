"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Publica o retira un area (o ficha) con un PATCH al backend. */
export function TogglePublicada({ ruta, publicada }: { ruta: string; publicada: boolean }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar() {
    setError(null);
    setCargando(true);
    try {
      const res = await fetch(`/api/backend${ruta}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicada: !publicada }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo cambiar.");
        return;
      }
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={publicada ? "outline" : "default"} disabled={cargando} onClick={cambiar}>
        {publicada ? "Retirar" : "Publicar"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}
