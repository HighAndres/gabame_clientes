import { ScrollText } from "lucide-react";
import Link from "next/link";

import { BarraFiltros } from "@/components/admin/barra-filtros";
import { Celda, FilaTabla, Paginacion, Tabla } from "@/components/admin/tabla";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { describirAccion } from "@/lib/bitacora";
import { fechaHora } from "@/lib/fechas";
import { apiConSesion } from "@/lib/sesion";
import type { PaginaBitacora } from "@/types/admin";

const POR_PAGINA = 25;
const COLUMNAS = "130px minmax(0,1fr) minmax(0,1fr) minmax(0,2.2fr)";

/** Espejo de `TipoMovimiento` en app/services/bitacora.py. */
const TIPOS = [
  { valor: "", texto: "Todos los movimientos" },
  { valor: "medicos", texto: "Acreditaciones de médicos" },
  { valor: "partners", texto: "Vínculos y documentos de partners" },
  { valor: "cuentas", texto: "Cuentas y roles" },
];

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Quien hizo que sobre quien, dentro del alcance. Solo lectura. */
export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const pagina = Math.max(1, Number(texto(searchParams.pagina)) || 1);
  const tipoParam = texto(searchParams.tipo);
  const tipo = TIPOS.some((t) => t.valor === tipoParam) ? tipoParam : "";

  const params = new URLSearchParams({ limit: String(POR_PAGINA), offset: String((pagina - 1) * POR_PAGINA) });
  if (tipo) params.set("tipo", tipo);
  const datos = await apiConSesion<PaginaBitacora>(`/admin/bitacora?${params}`);
  const paginas = Math.max(1, Math.ceil(datos.total / POR_PAGINA));

  const enlace = (p: number) => {
    const s = new URLSearchParams();
    if (tipo) s.set("tipo", tipo);
    s.set("pagina", String(p));
    return `/admin/bitacora?${s}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoArea
        icono={ScrollText}
        etiqueta="Bitácora"
        titulo="Movimientos"
        descripcion="Cada aprobación, rechazo y cambio de cuenta queda registrado con quién lo hizo y cuándo. No se edita."
      />

      <BarraFiltros
        accion="/admin/bitacora"
        selects={[{ nombre: "tipo", etiqueta: "Tipo de movimiento", valor: tipo, opciones: TIPOS }]}
      />

      <Tabla
        columnas={COLUMNAS}
        cabeceras={["Cuándo", "Quién", "Sobre quién", "Movimiento"]}
        cantidad={datos.items.length}
        vacio={tipo ? "Sin movimientos de este tipo." : "Sin movimientos todavía."}
        pie={
          <Paginacion
            resumen={`${datos.total} ${datos.total === 1 ? "movimiento" : "movimientos"}`}
            pagina={pagina}
            paginas={paginas}
            enlace={enlace}
          />
        }
      >
        {datos.items.map((b) => (
          <FilaTabla key={b.id}>
            <Celda>
              <span className="text-xs text-muted-foreground">{fechaHora(b.creado_en)}</span>
            </Celda>
            <Celda etiqueta="Quién">
              <span className="truncate font-bold">{b.actor?.nombre ?? "Sistema"}</span>
            </Celda>
            <Celda etiqueta="Sobre quién">
              {b.objetivo ? (
                <Link href={`/admin/usuarios/${b.objetivo.id}`} className="truncate font-bold text-primary hover:text-primary-hover">
                  {b.objetivo.nombre}
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Celda>
            <Celda etiqueta="Movimiento">
              <span className="text-muted-foreground">{describirAccion(b)}</span>
            </Celda>
          </FilaTabla>
        ))}
      </Tabla>
    </div>
  );
}
