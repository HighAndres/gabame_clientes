"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { DocumentoOut } from "@/types/partner";

const ESTADO = { pendiente: "En revision", validado: "Aceptado", rechazado: "Rechazado" };

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Documentos de un requisito: lista con descarga, retiro (solo pendientes) y carga de uno nuevo.
 * El archivo viaja por el proxy al backend; el navegador nunca ve el token.
 */
export function SubirDocumento({
  tipo,
  documentos,
  limiteMb,
  tiposPermitidos,
}: {
  tipo: string;
  documentos: DocumentoOut[];
  limiteMb: number;
  tiposPermitidos: string[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    const archivo = input.current?.files?.[0];
    if (!archivo) return;
    setError(null);
    if (archivo.size > limiteMb * 1024 * 1024) {
      setError(`El archivo supera ${limiteMb} MB.`);
      return;
    }
    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("archivo", archivo);
    setCargando(true);
    try {
      const res = await fetch("/api/backend/partners/me/documentos", { method: "POST", body: fd });
      if (!res.ok) {
        const d = (await res.json().catch(() => null))?.detail;
        setError(d?.mensaje ?? "No se pudo subir el archivo.");
        return;
      }
      if (input.current) input.current.value = "";
      router.refresh();
    } finally {
      setCargando(false);
    }
  }

  async function retirar(id: string) {
    setError(null);
    const res = await fetch(`/api/backend/partners/me/documentos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = (await res.json().catch(() => null))?.detail;
      setError(d?.mensaje ?? "No se pudo retirar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {documentos.length > 0 && (
        <ul className="divide-y rounded-md border text-sm">
          {documentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="space-x-2">
                <a
                  href={`/api/backend/partners/me/documentos/${d.id}/archivo`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {d.nombre_archivo}
                </a>
                <span className="text-xs text-muted-foreground">
                  {tamano(d.tamano_bytes)} · {ESTADO[d.estado]}
                </span>
                {d.motivo_rechazo && <span className="text-xs text-destructive">Motivo: {d.motivo_rechazo}</span>}
              </span>
              {d.estado === "pendiente" && (
                <Button size="sm" variant="ghost" onClick={() => retirar(d.id)}>
                  Retirar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={subir} className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" accept={tiposPermitidos.join(",")} className="text-sm" aria-label={`Archivo para ${tipo}`} />
        <Button type="submit" size="sm" variant="outline" disabled={cargando}>
          {cargando ? "Subiendo..." : "Subir"}
        </Button>
        <span className="text-xs text-muted-foreground">PDF, JPG o PNG, hasta {limiteMb} MB.</span>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
