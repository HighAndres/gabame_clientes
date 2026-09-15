import { ScrollText } from "lucide-react";
import Link from "next/link";

import { BitacoraLista } from "@/components/admin/bitacora-lista";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { apiConSesion } from "@/lib/sesion";
import type { PaginaBitacora } from "@/types/admin";

const POR_PAGINA = 25;

/** Quien hizo que sobre quien, dentro del alcance. Solo lectura. */
export default async function BitacoraPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const pagina = Math.max(1, Number(searchParams.pagina ?? 1) || 1);
  const datos = await apiConSesion<PaginaBitacora>(`/admin/bitacora?limit=${POR_PAGINA}&offset=${(pagina - 1) * POR_PAGINA}`);
  const paginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA));

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoArea
        icono={ScrollText}
        etiqueta="Bitácora"
        titulo="Movimientos"
        descripcion="Cada aprobación, rechazo y cambio de cuenta queda registrado con quién lo hizo y cuándo. No se edita."
      />
      <div className="overflow-hidden rounded-lg border bg-card">
        <BitacoraLista items={datos.items} />
        <div className="flex items-center justify-between border-t px-5 py-3 text-[13px] text-muted-foreground">
          <span>
            {datos.total} movimientos · página {pagina} de {paginas}
          </span>
          <span className="flex gap-4">
            {pagina > 1 && (
              <Link href={`/admin/bitacora?pagina=${pagina - 1}`} className="font-bold text-primary hover:text-primary-hover">
                ← Anterior
              </Link>
            )}
            {pagina < paginas && (
              <Link href={`/admin/bitacora?pagina=${pagina + 1}`} className="font-bold text-primary hover:text-primary-hover">
                Siguiente →
              </Link>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
