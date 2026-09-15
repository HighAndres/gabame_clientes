import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Franja de encabezado de un area: donde estas, en que estado y que puedes hacer.
 *
 * Todas las areas del portal y del panel abrian igual, con un titulo suelto sobre el mismo fondo
 * gris, asi que entrar al area medica o a Partners se sentia identico. La marca (icono en azul
 * suave, o el logotipo de la empresa cuando el area es su espacio) y la etiqueta dan esa
 * identidad sin inventar una paleta por seccion: la del portal es la del grupo (docs/diseno.md).
 *
 * Es una franja, no una tarjeta: se separa del contenido por una linea, no por una caja, para que
 * lea como cabecera y no como un elemento mas de la pagina.
 */
export function EncabezadoArea({
  icono: Icono,
  marca,
  etiqueta,
  titulo,
  descripcion,
  estado,
  acciones,
  volver,
}: {
  /** Icono del area. Se ignora si viene `marca`. */
  icono?: LucideIcon;
  /** Marca propia del area (el logotipo de una empresa en su espacio). */
  marca?: React.ReactNode;
  etiqueta?: string;
  titulo: string;
  descripcion?: React.ReactNode;
  estado?: React.ReactNode;
  acciones?: React.ReactNode;
  volver?: { href: string; texto: string };
}) {
  return (
    <header className="flex flex-col gap-2 border-b pb-5">
      {volver && (
        <Link href={volver.href} className="text-xs text-muted-foreground hover:text-primary">
          ← {volver.texto}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          {marca ??
            (Icono && (
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground"
              >
                <Icono className="h-5 w-5" strokeWidth={1.5} />
              </span>
            ))}
          <div className="flex min-w-0 flex-col gap-1">
            {etiqueta && (
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">{etiqueta}</p>
            )}
            <h1 className="text-[26px] font-bold leading-tight">{titulo}</h1>
            {descripcion && <p className="text-sm leading-relaxed text-muted-foreground">{descripcion}</p>}
          </div>
        </div>
        {(estado || acciones) && (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {estado}
            {acciones}
          </div>
        )}
      </div>
    </header>
  );
}
