import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/portal/markdown";
import { ApiError } from "@/lib/api";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { FichaOut } from "@/types/contenido";

/** Ficha tecnica. Markdown sin HTML crudo (react-markdown lo escapa por defecto). */
export default async function FichaPage({ params }: { params: { area: string; ficha: string } }) {
  const u = await leerUsuarioActual();
  if (!u || u.estado_medico !== "validado") notFound();

  let ficha: FichaOut;
  try {
    ficha = await apiConSesion<FichaOut>(
      `/medicos/areas/${encodeURIComponent(params.area)}/fichas/${encodeURIComponent(params.ficha)}`,
    );
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  return (
    <article className="flex max-w-3xl flex-col gap-4 rounded-lg border bg-card p-7 md:p-8">
      <p className="text-xs text-muted-foreground">
        <Link href={`/medico/${ficha.area_slug}`} className="text-primary hover:text-primary-hover">
          {ficha.area_nombre}
        </Link>{" "}
        · Ficha tecnica
      </p>
      <h2 className="text-2xl font-bold">{ficha.nombre}</h2>
      {ficha.resumen && <p className="text-[15px] text-muted-foreground">{ficha.resumen}</p>}

      <Markdown>{ficha.contenido}</Markdown>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Informacion dirigida exclusivamente a profesionales de la salud. Actualizada el{" "}
        {new Date(ficha.actualizado_en).toLocaleDateString("es-MX")}.
      </p>
    </article>
  );
}
