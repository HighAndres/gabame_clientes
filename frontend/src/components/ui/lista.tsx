import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Lista compacta: una caja con borde y filas separadas por linea.
 *
 * Sustituye a las cuadriculas de tarjetas cuando lo que hay son elementos equivalentes que la
 * persona recorre con la vista. Una tarjeta pesa como un destino; doce tarjetas iguales no pesan
 * nada y ademas ocupan tres pantallas. Sin sombras, como todo el sistema (docs/diseno.md).
 */
export function Lista({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>{children}</ul>;
}

/**
 * Fila de una lista. `titulo` es lo que se lee primero; `meta` lo que la acompana en gris;
 * `derecha` lo que se alinea al final (un chip de estado, una fecha, una cifra).
 */
export function Fila({
  href,
  titulo,
  meta,
  derecha,
  externo = false,
}: {
  href: string;
  titulo: React.ReactNode;
  meta?: React.ReactNode;
  derecha?: React.ReactNode;
  externo?: boolean;
}) {
  const clases =
    "flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-background focus-visible:bg-background focus-visible:outline-none";
  const contenido = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold text-heading">{titulo}</span>
        {meta && <span className="truncate text-[13px] text-muted-foreground">{meta}</span>}
      </span>
      {derecha && <span className="flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground">{derecha}</span>}
    </>
  );
  return (
    <li>
      {externo ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>
          {contenido}
        </a>
      ) : (
        <Link href={href} className={clases}>
          {contenido}
        </Link>
      )}
    </li>
  );
}

/** Encabezado de una seccion de lista: titulo a la izquierda, enlace secundario a la derecha. */
export function TituloSeccion({
  children,
  href,
  accion,
}: {
  children: React.ReactNode;
  href?: string;
  accion?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-[17px] font-bold">{children}</h2>
      {href && accion && (
        <Link href={href} className="text-[13px] font-bold text-primary hover:text-primary-hover">
          {accion}
        </Link>
      )}
    </div>
  );
}
