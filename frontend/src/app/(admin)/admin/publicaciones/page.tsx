import { ArrowUpRight, Newspaper } from "lucide-react";
import Link from "next/link";

import { BarraFiltros } from "@/components/admin/barra-filtros";
import { PublicacionForm } from "@/components/admin/publicacion-form";
import { Celda, FilaTabla, Tabla } from "@/components/admin/tabla";
import { TogglePublicada } from "@/components/admin/toggle-publicada";
import { buttonVariants } from "@/components/ui/button";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado } from "@/components/ui/estado";
import { dia, fecha } from "@/lib/fechas";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { NOMBRE_AUDIENCIA, type PublicacionOut } from "@/types/admin";
import type { Audiencia, Empresa } from "@/types/auth";

const AUDIENCIAS: Audiencia[] = ["pacientes", "medicos", "partners"];
const AUDIENCIA_CORTA: Record<Audiencia, string> = { pacientes: "Pacientes", medicos: "Médicos", partners: "Partners" };

/** Estados con los que se filtra. "vencida" es publicada con la vigencia ya terminada: no se ve. */
const ESTADOS = [
  { valor: "", texto: "Todos los estados" },
  { valor: "publicada", texto: "Publicadas y vigentes" },
  { valor: "borrador", texto: "Borradores" },
  { valor: "vencida", texto: "Vigencia terminada" },
] as const;
type EstadoFiltro = (typeof ESTADOS)[number]["valor"];

const COLUMNAS = "minmax(0,2fr) 100px 130px 110px 96px 190px";

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/** Solo el dominio, para leer de un vistazo adonde lleva. Nunca rompe la pagina por un dato raro. */
function dominio(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function coincideEstado(p: PublicacionOut, estado: EstadoFiltro): boolean {
  if (estado === "publicada") return p.publicada && !p.vencida;
  if (estado === "borrador") return !p.publicada;
  if (estado === "vencida") return p.publicada && p.vencida;
  return true;
}

/**
 * Lo que cada empresa publica dentro de su espacio. Una tabla con filtros en vez de una tarjeta
 * por audiencia: con promociones de por medio, lo que se busca es "que vence" o "que sigue en
 * borrador", no leer las tres listas completas. La lista de una empresa es corta, asi que el
 * filtro se aplica aqui sobre lo que ya devolvio el backend.
 */
export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const a = alcanceDe(u);
  const param = texto(searchParams.empresa);
  const empresa = (a.empresas.includes(param as Empresa) ? param : a.empresas[0]) as Empresa;
  const todas = await apiConSesion<PublicacionOut[]>(`/admin/espacios/${empresa}/publicaciones`);

  const buscar = texto(searchParams.buscar);
  const audienciaParam = texto(searchParams.audiencia);
  const audiencia = AUDIENCIAS.includes(audienciaParam as Audiencia) ? (audienciaParam as Audiencia) : "";
  const estadoParam = texto(searchParams.estado);
  const estado = (ESTADOS.some((e) => e.valor === estadoParam) ? estadoParam : "") as EstadoFiltro;

  const publicaciones = todas.filter(
    (p) =>
      (!audiencia || p.audiencia === audiencia) &&
      coincideEstado(p, estado) &&
      (!buscar || p.titulo.toLowerCase().includes(buscar.toLowerCase())),
  );
  const vencidas = todas.filter((p) => p.publicada && p.vencida).length;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoArea
        icono={Newspaper}
        etiqueta={`${NOMBRE_EMPRESA[empresa]} · Publicaciones`}
        titulo="Publicaciones del espacio"
        descripcion="Cada publicación va a una audiencia; el portal la muestra solo a quien corresponde."
        acciones={
          a.empresas.length > 1 && (
            <nav className="flex flex-wrap gap-2 text-[13px]" aria-label="Empresa">
              {a.empresas.map((e) => (
                <Link
                  key={e}
                  href={`/admin/publicaciones?empresa=${e}`}
                  aria-current={e === empresa ? "page" : undefined}
                  className={cn(
                    "inline-flex h-[34px] items-center rounded-md px-3 font-bold",
                    e === empresa ? "bg-primary text-white" : "border text-heading hover:bg-background",
                  )}
                >
                  {NOMBRE_EMPRESA[e]}
                </Link>
              ))}
            </nav>
          )
        }
      />

      <details className="rounded-lg border bg-card p-4">
        <summary className="cursor-pointer text-sm font-bold">Nueva publicación en {NOMBRE_EMPRESA[empresa]}</summary>
        <div className="pt-4">
          <PublicacionForm empresa={empresa} />
        </div>
      </details>

      <BarraFiltros
        accion="/admin/publicaciones"
        conservar={{ empresa }}
        busqueda={{ nombre: "buscar", valor: buscar, placeholder: "Buscar por título" }}
        selects={[
          {
            nombre: "audiencia",
            etiqueta: "Audiencia",
            valor: audiencia,
            opciones: [{ valor: "", texto: "Todas las audiencias" }, ...AUDIENCIAS.map((x) => ({ valor: x, texto: NOMBRE_AUDIENCIA[x] }))],
          },
          { nombre: "estado", etiqueta: "Estado", valor: estado, opciones: [...ESTADOS] },
        ]}
        total={vencidas > 0 && estado !== "vencida" ? `${vencidas} con la vigencia terminada` : undefined}
      />

      <Tabla
        columnas={COLUMNAS}
        cabeceras={["Título", "Audiencia", "Estado", "Vigencia", "Actualizada", ""]}
        cantidad={publicaciones.length}
        vacio={todas.length === 0 ? "Esta empresa no ha publicado nada todavía." : "Nada coincide con los filtros."}
        pie={
          <span>
            {publicaciones.length === todas.length
              ? `${todas.length} ${todas.length === 1 ? "publicación" : "publicaciones"}`
              : `${publicaciones.length} de ${todas.length} publicaciones`}
          </span>
        }
      >
        {publicaciones.map((p) => (
          <FilaTabla key={p.id} atenuada={!p.publicada}>
            <Celda>
              <Link href={`/admin/publicaciones/${p.id}`} className="truncate font-bold text-heading hover:text-primary">
                {p.titulo}
              </Link>
              {p.url_externa ? (
                <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{dominio(p.url_externa)}</span>
                </span>
              ) : (
                p.resumen && <span className="truncate text-xs text-muted-foreground">{p.resumen}</span>
              )}
            </Celda>
            <Celda etiqueta="Audiencia">
              <span>{AUDIENCIA_CORTA[p.audiencia]}</span>
            </Celda>
            <Celda etiqueta="Estado">
              {/* Una promocion vencida sigue marcada como publicada pero ya no se ve: se dice aqui. */}
              {p.publicada && p.vencida ? (
                <Estado tono="rechazado" className="self-start">
                  Vigencia terminada
                </Estado>
              ) : (
                <Estado tono={p.publicada ? "publicada" : "borrador"} className="self-start" />
              )}
            </Celda>
            <Celda etiqueta="Vigencia">
              <span className={p.vencida ? "text-destructive" : "text-muted-foreground"}>
                {p.vigencia_hasta ? `Hasta el ${dia(p.vigencia_hasta, { day: "numeric", month: "short" })}` : "Sin fin"}
              </span>
            </Celda>
            <Celda etiqueta="Actualizada">
              <span className="text-muted-foreground">{fecha(p.actualizado_en)}</span>
            </Celda>
            <Celda className="pt-1 xl:pt-0">
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link href={`/admin/publicaciones/${p.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                  Editar
                </Link>
                <TogglePublicada ruta={`/admin/publicaciones/${p.id}`} publicada={p.publicada} />
              </div>
            </Celda>
          </FilaTabla>
        ))}
      </Tabla>
    </div>
  );
}
