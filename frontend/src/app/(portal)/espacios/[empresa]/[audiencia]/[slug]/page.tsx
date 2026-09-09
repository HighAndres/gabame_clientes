import Link from "next/link";
import { notFound } from "next/navigation";

import { Markdown } from "@/components/portal/markdown";
import { ApiError } from "@/lib/api";
import { EMPRESAS, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { PublicacionOut } from "@/types/admin";
import type { Audiencia, Empresa } from "@/types/auth";
import { AUDIENCIAS, TITULO_AUDIENCIA } from "@/types/espacios";

/** Una publicacion del espacio. El backend aplica la puerta por audiencia; un 403 se muestra como no encontrado. */
export default async function PublicacionPage({ params }: { params: { empresa: string; audiencia: string; slug: string } }) {
  if (!EMPRESAS.includes(params.empresa as Empresa) || !AUDIENCIAS.includes(params.audiencia as Audiencia)) notFound();

  let p: PublicacionOut;
  try {
    p = await apiConSesion<PublicacionOut>(
      `/espacios/${params.empresa}/publicaciones/${params.audiencia}/${encodeURIComponent(params.slug)}`,
    );
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  return (
    <article className="flex max-w-3xl flex-col gap-4 rounded-lg border bg-card p-7 md:p-8">
      <p className="text-xs text-muted-foreground">
        <Link href={`/espacios/${p.empresa}`} className="text-primary hover:text-primary-hover">
          {NOMBRE_EMPRESA[p.empresa]}
        </Link>{" "}
        · {TITULO_AUDIENCIA[p.audiencia]}
      </p>
      <h1 className="text-2xl font-bold">{p.titulo}</h1>
      {p.resumen && <p className="text-[15px] text-muted-foreground">{p.resumen}</p>}
      <Markdown>{p.contenido}</Markdown>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Publicado por {NOMBRE_EMPRESA[p.empresa]}. Actualizado el {new Date(p.actualizado_en).toLocaleDateString("es-MX")}.
      </p>
    </article>
  );
}
