"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { fecha } from "@/lib/fechas";
import { enviar, mensajeDeError } from "@/lib/peticion";

/**
 * Borrado definitivo de una cuenta que pidio su baja (ADR-0016).
 *
 * El boton solo existe cuando hay solicitud: el backend rechaza igual, pero ofrecer "eliminar"
 * sobre cualquier cuenta invitaria a usarlo como castigo, y para eso ya esta desactivar.
 */
export function EliminarCuenta({
  usuarioId,
  nombre,
  solicitadaEn,
  motivo,
}: {
  usuarioId: string;
  nombre: string;
  solicitadaEn: string;
  motivo: string | null;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function eliminar() {
    setError(null);
    setCargando(true);
    try {
      const res = await enviar(`/api/backend/admin/usuarios/${usuarioId}`, { method: "DELETE" });
      if (!res.ok) {
        setError(await mensajeDeError(res, "No se pudo eliminar la cuenta."));
        return;
      }
      router.push("/admin/usuarios?bajas=true");
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-5">
      <div className="space-y-1">
        <h2 className="text-base font-bold">Pidió la baja de su cuenta</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          El {fecha(solicitadaEn)}. Su acceso ya está cerrado.
          {motivo ? ` Motivo: "${motivo}".` : " No indicó motivo."}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Al eliminarla se borran sus datos y sus archivos. La bitácora conserva qué pasó y cuándo, sin sus
          datos. No se puede deshacer.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">¿Eliminar la cuenta de {nombre}?</span>
          <Button size="sm" variant="destructive" disabled={cargando} onClick={eliminar}>
            {cargando ? "Eliminando..." : "Sí, eliminar"}
          </Button>
          <Button size="sm" variant="ghost" disabled={cargando} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="destructive" className="self-start" onClick={() => setConfirmando(true)}>
          Eliminar cuenta
        </Button>
      )}
    </section>
  );
}
