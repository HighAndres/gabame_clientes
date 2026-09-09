import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

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

      <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
        <ReactMarkdown
          components={{
            h1: (p) => <h3 className="mt-4 text-lg font-bold" {...p} />,
            h2: (p) => <h3 className="mt-4 text-lg font-bold" {...p} />,
            h3: (p) => <h4 className="mt-3 text-base font-bold" {...p} />,
            ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
            ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
            a: (p) => <a className="text-primary underline" target="_blank" rel="noopener noreferrer" {...p} />,
            table: (p) => (
              <div className="overflow-x-auto">
                <table className="w-full border text-left text-sm" {...p} />
              </div>
            ),
            th: (p) => <th className="border bg-background px-2 py-1" {...p} />,
            td: (p) => <td className="border px-2 py-1" {...p} />,
          }}
        >
          {ficha.contenido}
        </ReactMarkdown>
      </div>

      <p className="border-t pt-3 text-xs text-muted-foreground">
        Informacion dirigida exclusivamente a profesionales de la salud. Actualizada el{" "}
        {new Date(ficha.actualizado_en).toLocaleDateString("es-MX")}.
      </p>
    </article>
  );
}
