import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Tabla densa del panel (opcion C). Antes cada cola repetia su propia cabecera, filas y pie con
 * la plantilla de columnas copiada tres veces; ahora la plantilla se declara una vez.
 *
 * - `columnas` es un `grid-template-columns` normal. Va en una variable CSS porque Tailwind no
 *   genera clases armadas en tiempo de ejecucion; `xl:grid-cols-[var(--columnas)]` si es estatica.
 * - A partir de `xl` es tabla; por debajo cada fila se apila y cada celda muestra su etiqueta.
 *   El breakpoint es `xl` y no `md` por la barra lateral de 248 px (docs/diseno.md).
 */
export function Tabla({
  columnas,
  cabeceras,
  vacio = "Sin resultados.",
  cantidad,
  pie,
  children,
}: {
  columnas: string;
  cabeceras: string[];
  vacio?: string;
  cantidad: number;
  pie?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border bg-card"
      style={{ "--columnas": columnas } as React.CSSProperties}
      role="table"
    >
      <div
        role="row"
        className="hidden gap-3 bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground xl:grid xl:grid-cols-[var(--columnas)]"
      >
        {cabeceras.map((c, i) => (
          <span key={i} role="columnheader">
            {c}
          </span>
        ))}
      </div>
      {cantidad === 0 ? <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">{vacio}</p> : children}
      {pie && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-[13px] text-muted-foreground">
          {pie}
        </div>
      )}
    </div>
  );
}

export function FilaTabla({ children, atenuada = false }: { children: React.ReactNode; atenuada?: boolean }) {
  return (
    <div
      role="row"
      className={cn(
        "grid items-center gap-x-3 gap-y-1.5 border-t px-5 py-3 text-sm transition-colors hover:bg-background/60 xl:grid-cols-[var(--columnas)]",
        atenuada && "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

/** Celda. `etiqueta` solo se ve con la fila apilada, donde ya no hay cabecera encima. */
export function Celda({
  etiqueta,
  children,
  className,
}: {
  etiqueta?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="cell" className={cn("flex min-w-0 flex-col", className)}>
      {etiqueta && (
        <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground xl:hidden">
          {etiqueta}
        </span>
      )}
      {children}
    </div>
  );
}

/** Pie con conteo y paginacion. `enlace(p)` arma la URL conservando los filtros. */
export function Paginacion({
  resumen,
  pagina,
  paginas,
  enlace,
}: {
  resumen: string;
  pagina: number;
  paginas: number;
  enlace: (p: number) => string;
}) {
  return (
    <>
      <span>
        {resumen}
        {paginas > 1 && ` · página ${pagina} de ${paginas}`}
      </span>
      {paginas > 1 && (
        <span className="flex gap-4">
          {pagina > 1 && (
            <Link href={enlace(pagina - 1)} className="font-bold text-primary hover:text-primary-hover">
              ← Anterior
            </Link>
          )}
          {pagina < paginas && (
            <Link href={enlace(pagina + 1)} className="font-bold text-primary hover:text-primary-hover">
              Siguiente →
            </Link>
          )}
        </span>
      )}
    </>
  );
}
