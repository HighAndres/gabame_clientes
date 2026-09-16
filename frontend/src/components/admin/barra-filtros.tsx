"use client";

import Link from "next/link";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface OpcionFiltro {
  valor: string;
  texto: string;
}

export interface SelectFiltro {
  nombre: string;
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
}

/**
 * Barra de filtros del panel: busqueda libre y listas, en la URL.
 *
 * Es un formulario GET: los filtros viven en la direccion, asi que se comparten, se recargan y
 * funcionan igual sin JavaScript (con el boton). Con JavaScript, cambiar una lista filtra al
 * momento; la busqueda se aplica con Enter o con el boton, no en cada tecla.
 */
export function BarraFiltros({
  accion,
  busqueda,
  selects = [],
  conservar = {},
  total,
}: {
  accion: string;
  busqueda?: { nombre: string; valor: string; placeholder: string };
  selects?: SelectFiltro[];
  /** Parametros que no se editan aqui pero deben sobrevivir al filtrar (p. ej. la empresa). */
  conservar?: Record<string, string>;
  total?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const hayFiltro = Boolean(busqueda?.valor) || selects.some((s) => s.valor !== (s.opciones[0]?.valor ?? ""));
  const limpiar = Object.keys(conservar).length ? `${accion}?${new URLSearchParams(conservar)}` : accion;

  return (
    <form
      ref={form}
      method="get"
      action={accion}
      role="search"
      className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3"
    >
      {Object.entries(conservar).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {busqueda && (
        <Input
          name={busqueda.nombre}
          defaultValue={busqueda.valor}
          placeholder={busqueda.placeholder}
          aria-label={busqueda.placeholder}
          className="h-9 w-full sm:max-w-xs"
          maxLength={120}
        />
      )}
      {selects.map((s) => (
        <select
          key={s.nombre}
          name={s.nombre}
          defaultValue={s.valor}
          aria-label={s.etiqueta}
          onChange={() => form.current?.requestSubmit()}
          className="h-9 rounded-md border border-input bg-card px-3 text-sm"
        >
          {s.opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
      ))}
      <Button type="submit" variant="outline" size="sm">
        Filtrar
      </Button>
      {hayFiltro && (
        <Link href={limpiar} className="text-[13px] font-bold text-primary hover:text-primary-hover">
          Limpiar
        </Link>
      )}
      {total && <span className="ml-auto text-[13px] text-muted-foreground">{total}</span>}
    </form>
  );
}
