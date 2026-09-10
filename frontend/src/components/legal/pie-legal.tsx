import { ModalLegal } from "@/components/legal/modal-legal";

/** Pie comun: nombre del grupo y enlaces que abren los documentos legales en modal. */
export function PieLegal({ className = "" }: { className?: string }) {
  return (
    <footer className={`container flex flex-wrap items-center justify-between gap-3 py-6 text-xs text-muted-foreground ${className}`}>
      <span>GABAME Human Health</span>
      <span className="flex flex-wrap gap-4">
        <ModalLegal documento="aviso-privacidad" />
        <ModalLegal documento="terminos" />
      </span>
    </footer>
  );
}
