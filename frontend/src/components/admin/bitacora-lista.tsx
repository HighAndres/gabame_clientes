import Link from "next/link";

import { describirAccion } from "@/lib/bitacora";
import type { BitacoraOut } from "@/types/admin";

/** Filas de bitacora (server component). `conObjetivo` muestra sobre quien fue la accion. */
export function BitacoraLista({ items, conObjetivo = true }: { items: BitacoraOut[]; conObjetivo?: boolean }) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin movimientos todavía.</p>;
  }
  return (
    <ul className="divide-y">
      {items.map((b) => (
        <li key={b.id} className="grid gap-1 px-5 py-3 text-sm md:grid-cols-[150px_minmax(0,1fr)] md:gap-4">
          <span className="text-xs text-muted-foreground">
            {new Date(b.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>
              <span className="font-bold">{b.actor?.nombre ?? "Sistema"}</span>
              {conObjetivo && b.objetivo && (
                <>
                  {" "}
                  →{" "}
                  <Link href={`/admin/usuarios/${b.objetivo.id}`} className="font-bold text-primary hover:text-primary-hover">
                    {b.objetivo.nombre}
                  </Link>
                </>
              )}
            </span>
            <span className="text-muted-foreground">{describirAccion(b)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
