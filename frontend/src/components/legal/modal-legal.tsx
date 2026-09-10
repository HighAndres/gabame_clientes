"use client";

import { X } from "lucide-react";
import { useRef } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type DocumentoLegal, DOCUMENTOS_LEGALES } from "@/legal/documentos";

/**
 * Enlace que abre un documento legal en un modal (elemento <dialog> nativo: foco atrapado,
 * Escape cierra, fondo inerte). El texto viene de `src/legal/documentos.ts`.
 */
export function ModalLegal({
  documento,
  children,
  className,
}: {
  documento: DocumentoLegal;
  children?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const doc = DOCUMENTOS_LEGALES[documento];

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={cn("text-primary underline-offset-2 hover:text-primary-hover hover:underline", className)}
      >
        {children ?? doc.titulo}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`legal-${documento}-titulo`}
        className="w-[min(92vw,720px)] rounded-lg border bg-card p-0 text-foreground backdrop:bg-[#2b2b2d]/50"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
            <div className="flex flex-col gap-0.5">
              <h2 id={`legal-${documento}-titulo`} className="text-lg font-bold">
                {doc.titulo}
              </h2>
              {doc.provisional && (
                <span className="text-xs text-warning">Texto provisional: se sustituirá por el que entregue el grupo.</span>
              )}
            </div>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => ref.current?.close()}
              className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-heading"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5 text-[15px] leading-relaxed">
            <ReactMarkdown
              components={{
                h2: (p) => <h3 className="mt-3 text-base font-bold" {...p} />,
                ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
                a: (p) => <a className="text-primary underline" target="_blank" rel="noopener noreferrer" {...p} />,
              }}
            >
              {doc.contenido}
            </ReactMarkdown>
          </div>
          <div className="flex items-center justify-between gap-4 border-t px-6 py-3 text-xs text-muted-foreground">
            <span>Actualizado el {doc.actualizado}</span>
            <Button size="sm" variant="outline" onClick={() => ref.current?.close()}>
              Cerrar
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
