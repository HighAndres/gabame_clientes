"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enviarJson, mensajeDeError } from "@/lib/peticion";
import type { EstadoPartnerOut } from "@/types/partner";

/**
 * Razon social y RFC del propio partner (ADR-0014). Se corrigen mientras ninguna empresa aprobo
 * el vinculo; despues son los datos aprobados y cambiarlos es un tramite con esa empresa. Quien
 * puede editar lo dice el backend (`puede_editar_datos`); ocultar el formulario no es el permiso.
 */
export function DatosEmpresa({ partner }: { partner: EstadoPartnerOut }) {
  const router = useRouter();
  const [f, setF] = useState({ razon_social: partner.razon_social, rfc: partner.rfc ?? "" });
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const cambios: Record<string, string> = {};
    if (f.razon_social.trim() !== partner.razon_social) cambios.razon_social = f.razon_social;
    if (f.rfc.trim().toUpperCase() !== (partner.rfc ?? "")) cambios.rfc = f.rfc;
    if (Object.keys(cambios).length === 0) {
      setEstado({ tipo: "error", texto: "No hay cambios que guardar." });
      return;
    }
    setEstado(null);
    setCargando(true);
    try {
      const res = await enviarJson("/api/backend/partners/me", "PATCH", cambios);
      if (!res.ok) {
        setEstado({ tipo: "error", texto: await mensajeDeError(res) });
        return;
      }
      // Lo que quedo guardado, normalizado por el backend (RFC en mayusculas, sin espacios).
      const guardado = (await res.json()) as EstadoPartnerOut;
      setF({ razon_social: guardado.razon_social, rfc: guardado.rfc ?? "" });
      setEstado({ tipo: "ok", texto: "Datos de la empresa actualizados." });
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="max-w-xl space-y-4 rounded-lg border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">Datos de la empresa</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {partner.puede_editar_datos
            ? "Puedes corregirlos mientras ninguna empresa del grupo haya aprobado tu vínculo."
            : "Una empresa del grupo ya aprobó tu vínculo con estos datos. Para cambiarlos, escribe a su contacto comercial."}
        </p>
      </div>
      <form onSubmit={guardar} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="dp-razon">Razón social</Label>
          <Input
            id="dp-razon"
            maxLength={200}
            value={f.razon_social}
            disabled={!partner.puede_editar_datos}
            onChange={(e) => setF({ ...f, razon_social: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dp-rfc">RFC (opcional)</Label>
          <Input
            id="dp-rfc"
            maxLength={13}
            value={f.rfc}
            disabled={!partner.puede_editar_datos}
            onChange={(e) => setF({ ...f, rfc: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">12 caracteres para persona moral, 13 para persona física.</p>
        </div>
        {estado && (
          <p role="status" className={`text-sm ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>
            {estado.texto}
          </p>
        )}
        {partner.puede_editar_datos && (
          <Button type="submit" disabled={cargando}>
            Guardar datos de la empresa
          </Button>
        )}
      </form>
    </section>
  );
}
