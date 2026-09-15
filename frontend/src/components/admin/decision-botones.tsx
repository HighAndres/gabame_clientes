"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Aprobar / rechazar un perfil. Llama al backend via el proxy con el token de la cookie.
 * El rechazo exige motivo (el backend tambien lo exige).
 */
export function DecisionBotones({
  rutaAprobar,
  rutaRechazar,
  estado,
}: {
  rutaAprobar: string;
  rutaRechazar: string;
  estado: "pendiente" | "validado" | "rechazado";
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"idle" | "rechazando">("idle");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(ruta: string, cuerpo: { motivo?: string }) {
    setError(null);
    setCargando(true);
    try {
      const res = await fetch(`/api/backend${ruta}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo aplicar la decisión.");
        return;
      }
      setModo("idle");
      setMotivo("");
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  if (modo === "rechazando") {
    return (
      <div className="space-y-2">
        <textarea
          className="w-full rounded-md border border-input bg-transparent p-2 text-sm"
          rows={2}
          placeholder="Motivo del rechazo (se envia por correo)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" disabled={cargando || !motivo.trim()} onClick={() => enviar(rutaRechazar, { motivo })}>
            Confirmar rechazo
          </Button>
          <Button size="sm" variant="ghost" disabled={cargando} onClick={() => setModo("idle")}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        {estado !== "validado" && (
          <Button size="sm" disabled={cargando} onClick={() => enviar(rutaAprobar, {})}>
            Aprobar
          </Button>
        )}
        {estado !== "rechazado" && (
          <Button size="sm" variant="outline" disabled={cargando} onClick={() => setModo("rechazando")}>
            Rechazar
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
