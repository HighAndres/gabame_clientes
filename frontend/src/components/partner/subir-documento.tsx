"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import type { DocumentoOut } from "@/types/partner";

const TEXTO_ESTADO = { pendiente: "En revision", validado: "Aceptado", rechazado: "Rechazado" };

function tamano(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Fila de un requisito (lienzo aprobado): nombre y descripcion, archivo, estado y accion.
 * El archivo viaja por el proxy al backend; el navegador nunca ve el token.
 */
export function FilaRequisito({
  tipo,
  nombre,
  descripcion,
  obligatorio,
  documentos,
  limiteMb,
  tiposPermitidos,
}: {
  tipo: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  documentos: DocumentoOut[];
  limiteMb: number;
  tiposPermitidos: string[];
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  // El documento vigente es el mas reciente; los anteriores quedan como historial en el backend.
  const doc = documentos[documentos.length - 1];
  const rechazado = doc?.estado === "rechazado";

  async function subir(archivo: File) {
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
      router.refresh();
    } finally {
      setCargando(false);
      if (input.current) input.current.value = "";
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

  const etiquetaBoton = !doc ? "Subir" : rechazado ? "Subir nuevo" : "Reemplazar";

  return (
    <div
      className={`grid items-center gap-3 border-t px-5 py-4 text-sm md:grid-cols-[minmax(0,1fr)_170px_120px_140px] ${rechazado ? "bg-[#fffaf3]" : ""}`}
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-bold">
          {nombre}
          {!obligatorio && <span className="font-normal text-muted-foreground"> (opcional)</span>}
        </p>
        <p className={`text-[13px] ${rechazado ? "text-[#b03535]" : "text-muted-foreground"}`}>
          {rechazado && doc?.motivo_rechazo ? `Rechazado: ${doc.motivo_rechazo}. Sube uno nuevo.` : descripcion}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="min-w-0 text-[13px]">
        {doc ? (
          <a
            href={`/api/backend/partners/me/documentos/${doc.id}/archivo`}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-primary hover:text-primary-hover"
            title={doc.nombre_archivo}
          >
            {doc.nombre_archivo}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        {doc && <span className="block text-xs text-muted-foreground">{tamano(doc.tamano_bytes)}</span>}
      </div>

      <div>{doc && <Estado tono={tonoDeValidacion(doc.estado)}>{TEXTO_ESTADO[doc.estado]}</Estado>}</div>

      <div className="flex items-center justify-end gap-2">
        {doc?.estado === "pendiente" && (
          <Button size="sm" variant="ghost" onClick={() => retirar(doc.id)} disabled={cargando}>
            Retirar
          </Button>
        )}
        <input
          ref={input}
          type="file"
          accept={tiposPermitidos.join(",")}
          className="sr-only"
          aria-label={`Archivo para ${nombre}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void subir(f);
          }}
        />
        <Button
          size="sm"
          variant={rechazado || !doc ? "default" : "outline"}
          disabled={cargando}
          onClick={() => input.current?.click()}
        >
          {cargando ? "Subiendo..." : etiquetaBoton}
        </Button>
      </div>
    </div>
  );
}
