"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EspacioOut, EspacioUpdate } from "@/types/admin";
import type { Modulo } from "@/types/auth";

const MODULOS: { valor: Modulo; texto: string; detalle: string }[] = [
  { valor: "cuentas", texto: "Cuentas", detalle: "Aprobar vínculos de partners." },
  { valor: "documentos", texto: "Documentos", detalle: "Pedir y revisar documentos de partners." },
  { valor: "contactos", texto: "Contactos", detalle: "Mostrar contacto comercial y portal a partners aprobados." },
  { valor: "contenido_rx", texto: "Contenido Rx", detalle: "Fichas técnicas para médicos validados (GABAME)." },
];

/** Nombre, contacto y portal del espacio; modulos solo para admin del grupo. */
export function EspacioForm({ espacio, puedeModulos }: { espacio: EspacioOut; puedeModulos: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: espacio.nombre,
    contacto_nombre: espacio.contacto_nombre ?? "",
    contacto_email: espacio.contacto_email ?? "",
    contacto_telefono: espacio.contacto_telefono ?? "",
    portal_url: espacio.portal_url ?? "",
  });
  const [modulos, setModulos] = useState<Modulo[]>(espacio.modulos);
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setEstado(null);
    const datos: EspacioUpdate = {
      nombre: f.nombre,
      contacto_nombre: f.contacto_nombre || null,
      contacto_email: f.contacto_email || null,
      contacto_telefono: f.contacto_telefono || null,
      portal_url: f.portal_url || null,
      ...(puedeModulos ? { modulos } : {}),
    };
    setCargando(true);
    try {
      const res = await fetch(`/api/backend/admin/espacios/${espacio.empresa}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setEstado({ tipo: "error", texto: d?.mensaje ?? "No se pudo guardar." });
        return;
      }
      setEstado({ tipo: "ok", texto: "Espacio guardado." });
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  const id = (campo: string) => `${espacio.empresa}-${campo}`;

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={id("nombre")}>Nombre visible</Label>
          <Input id={id("nombre")} required minLength={2} value={f.nombre} onChange={set("nombre")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("portal")}>Portal operativo (https)</Label>
          <Input id={id("portal")} type="url" placeholder="https://" value={f.portal_url} onChange={set("portal_url")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("cnombre")}>Contacto comercial</Label>
          <Input id={id("cnombre")} value={f.contacto_nombre} onChange={set("contacto_nombre")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("cemail")}>Correo de contacto</Label>
          <Input id={id("cemail")} type="email" value={f.contacto_email} onChange={set("contacto_email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("ctel")}>Teléfono de contacto</Label>
          <Input id={id("ctel")} type="tel" value={f.contacto_telefono} onChange={set("contacto_telefono")} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold">Módulos habilitados</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MODULOS.map((m) => (
            <label key={m.valor} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${puedeModulos ? "" : "opacity-80"}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-primary"
                checked={modulos.includes(m.valor)}
                disabled={!puedeModulos}
                onChange={(e) => setModulos(e.target.checked ? [...modulos, m.valor] : modulos.filter((x) => x !== m.valor))}
              />
              <span className="flex flex-col">
                <span className="font-bold">{m.texto}</span>
                <span className="text-xs text-muted-foreground">{m.detalle}</span>
              </span>
            </label>
          ))}
        </div>
        {!puedeModulos && <p className="text-xs text-muted-foreground">Los módulos los define el administrador del grupo.</p>}
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={cargando || f.nombre.trim().length < 2}>
          Guardar espacio
        </Button>
        {estado && <span className={`text-xs ${estado.tipo === "error" ? "text-destructive" : "text-muted-foreground"}`}>{estado.texto}</span>}
      </div>
    </form>
  );
}
