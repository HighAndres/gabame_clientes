"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AcreditacionOut } from "@/types/medico";

// Pendiente 0.3 — buzon real de acreditaciones; lo entrega el cliente con el criterio de validacion.
const CONTACTO = "acreditaciones@gabame.com";

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * La acreditacion del propio medico: consultarla, corregirla y reenviarla tras un rechazo.
 *
 * Quien puede hacer que lo dice el backend (`puede_editar_cedula`, `puede_reenviar`); esta
 * pantalla solo lo obedece. Ocultar un campo no es un permiso: el backend rechaza igual.
 */
export function Acreditacion({ inicial }: { inicial: AcreditacionOut }) {
  const router = useRouter();
  const [a, setA] = useState(inicial);
  const [f, setF] = useState({
    cedula_profesional: "",
    especialidad: a.especialidad ?? "",
    institucion: a.institucion ?? "",
  });
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function llamar(ruta: string, method: string, body?: unknown): Promise<boolean> {
    setEstado(null);
    setCargando(true);
    try {
      const res = await fetch(`/api/backend/medicos/me/acreditacion${ruta}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) {
        setEstado({ tipo: "error", texto: cuerpo?.detail?.mensaje ?? "No se pudo guardar." });
        return false;
      }
      setA(cuerpo as AcreditacionOut);
      setF((v) => ({ ...v, cedula_profesional: "" }));
      router.refresh();
      return true;
    } finally {
      setCargando(false);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const cambios: Record<string, string> = {};
    if (f.cedula_profesional.trim()) cambios.cedula_profesional = f.cedula_profesional.trim();
    if (f.especialidad !== (a.especialidad ?? "")) cambios.especialidad = f.especialidad;
    if (f.institucion !== (a.institucion ?? "")) cambios.institucion = f.institucion;
    if (Object.keys(cambios).length === 0) {
      setEstado({ tipo: "error", texto: "No hay cambios que guardar." });
      return;
    }
    if (await llamar("", "PATCH", cambios)) setEstado({ tipo: "ok", texto: "Datos actualizados." });
  }

  async function reenviar() {
    if (await llamar("/reenviar", "POST")) {
      setEstado({ tipo: "ok", texto: "Tu acreditación volvió a la fila de revisión." });
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Acreditación profesional</h2>
        <Estado tono={tonoDeValidacion(a.estado)} />
      </div>

      {a.estado === "pendiente" && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          En revisión desde el {fecha(a.solicitada_en)}. Te avisamos por correo en cuanto haya respuesta;
          mientras tanto puedes corregir tus datos aquí. ¿Dudas?{" "}
          <a href={`mailto:${CONTACTO}`} className="font-bold text-primary hover:text-primary-hover">
            {CONTACTO}
          </a>
        </p>
      )}
      {a.estado === "validado" && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Validada{a.validado_en ? ` el ${fecha(a.validado_en)}` : ""}. Para cambiar tu cédula escribe a{" "}
          <a href={`mailto:${CONTACTO}`} className="font-bold text-primary hover:text-primary-hover">
            {CONTACTO}
          </a>
          .
        </p>
      )}
      {a.estado === "rechazado" && (
        <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-sm font-bold">No pudimos validar tu acreditación.</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {a.motivo_rechazo ?? "Revisa que los datos coincidan con tu registro profesional."}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Corrige lo que haga falta y vuelve a enviarla: la revisamos de nuevo.
          </p>
        </div>
      )}

      <form onSubmit={guardar} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="ac-cedula">Cédula profesional</Label>
          {a.puede_editar_cedula ? (
            <>
              <Input
                id="ac-cedula"
                placeholder={a.cedula_enmascarada || "Sin capturar"}
                value={f.cedula_profesional}
                maxLength={30}
                onChange={(e) => setF({ ...f, cedula_profesional: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Registrada: {a.cedula_enmascarada || "ninguna"}. Escríbela completa solo si vas a corregirla.
              </p>
            </>
          ) : (
            <>
              <Input id="ac-cedula" value={a.cedula_enmascarada} readOnly disabled />
              <p className="text-xs text-muted-foreground">La mostramos parcial: es un dato personal sensible.</p>
            </>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ac-especialidad">Especialidad</Label>
            <Input
              id="ac-especialidad"
              maxLength={120}
              value={f.especialidad}
              onChange={(e) => setF({ ...f, especialidad: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ac-institucion">Institución</Label>
            <Input
              id="ac-institucion"
              maxLength={160}
              value={f.institucion}
              onChange={(e) => setF({ ...f, institucion: e.target.value })}
            />
          </div>
        </div>
        {estado && (
          <p
            role="status"
            className={`text-sm ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}
          >
            {estado.texto}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={cargando}>
            Guardar cambios
          </Button>
          {a.puede_reenviar && (
            <Button type="button" variant="secondary" disabled={cargando} onClick={reenviar}>
              Enviar a revisión de nuevo
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
