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
    <article className="max-w-3xl space-y-6">
      <div>
        <Link href={`/medico/${ficha.area_slug}`} className="text-xs text-muted-foreground hover:underline">
          ← {ficha.area_nombre}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{ficha.nombre}</h1>
        {ficha.resumen && <p className="mt-1 text-sm text-muted-foreground">{ficha.resumen}</p>}
      </div>

      <div className="prose-gabame space-y-3 text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            h1: (p) => <h2 className="mt-6 text-xl font-semibold" {...p} />,
            h2: (p) => <h3 className="mt-5 text-lg font-semibold" {...p} />,
            h3: (p) => <h4 className="mt-4 font-semibold" {...p} />,
            ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
            ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
            a: (p) => <a className="text-primary underline" target="_blank" rel="noopener noreferrer" {...p} />,
            table: (p) => (
              <div className="overflow-x-auto">
                <table className="w-full border text-left text-xs" {...p} />
              </div>
            ),
            th: (p) => <th className="border bg-muted/50 px-2 py-1" {...p} />,
            td: (p) => <td className="border px-2 py-1" {...p} />,
          }}
        >
          {ficha.contenido}
        </ReactMarkdown>
      </div>

      <p className="text-xs text-muted-foreground">
        Informacion dirigida exclusivamente a profesionales de la salud. Actualizada el{" "}
        {new Date(ficha.actualizado_en).toLocaleDateString("es-MX")}.
      </p>
    </article>
  );
}
