"use client";

import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CONTACTO_DATOS } from "@/legal/contactos";
import { enviar, enviarJson, mensajeDeError } from "@/lib/peticion";

/**
 * Lo que la persona puede hacer con sus propios datos (ADR-0016): descargarlos y pedir la baja.
 *
 * El aviso de privacidad remite a un contacto que el grupo todavia no publica; estos dos derechos
 * —acceso y cancelacion— los resuelve el portal sin esperar a ese buzon.
 *
 * La baja cierra el acceso en el acto, asi que al confirmarla se sale de la sesion: quedarse en una
 * pantalla que ya no responde seria peor que salir.
 */
export function MisDatos() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await enviarJson("/api/backend/usuarios/me/baja", "POST", { motivo: motivo.trim() || null });
      if (!res.ok) {
        setError(await mensajeDeError(res, "No se pudo registrar tu solicitud."));
        return;
      }
      // La cuenta ya quedo cerrada en el backend: se borran las cookies y se sale.
      await enviar("/api/sesion", { method: "DELETE" });
      router.replace("/login?aviso=baja");
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Tus datos</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puedes llevarte una copia de todo lo que guardamos de ti, o pedir que demos de baja tu cuenta.
          Para cambiar tu correo, escribe a{" "}
          <a href={`mailto:${CONTACTO_DATOS}`} className="font-bold text-primary hover:text-primary-hover">
            {CONTACTO_DATOS}
          </a>
          .
        </p>
      </div>

      <a
        href="/api/backend/usuarios/me/datos"
        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Descargar mis datos
      </a>

      <div className="border-t pt-4">
        {!abierto ? (
          <Button variant="ghost" size="sm" className="px-0 text-destructive" onClick={() => setAbierto(true)}>
            Dar de baja mi cuenta
          </Button>
        ) : (
          <form onSubmit={confirmar} className="space-y-3" noValidate>
            <p className="text-sm font-bold">¿Damos de baja tu cuenta?</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Tu acceso se cierra de inmediato y el grupo elimina tu cuenta después de revisarla. Si cargaste
              documentos o tienes una relación comercial en curso, descarga antes tus datos.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="baja-motivo">¿Por qué te vas? (opcional)</Label>
              <Input
                id="baja-motivo"
                maxLength={500}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Nos ayuda a mejorar"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="destructive" disabled={cargando}>
                {cargando ? "Enviando..." : "Sí, dar de baja"}
              </Button>
              <Button type="button" variant="ghost" disabled={cargando} onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
