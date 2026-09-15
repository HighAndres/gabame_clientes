import { Newspaper } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicacionForm } from "@/components/admin/publicacion-form";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { ApiError } from "@/lib/api";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import { NOMBRE_AUDIENCIA, type PublicacionOut } from "@/types/admin";

export default async function EditarPublicacionPage({ params }: { params: { id: string } }) {
  let p: PublicacionOut;
  try {
    p = await apiConSesion<PublicacionOut>(`/admin/publicaciones/${encodeURIComponent(params.id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <EncabezadoArea
        icono={Newspaper}
        etiqueta="Publicación"
        titulo={p.titulo}
        volver={{
          href: `/admin/publicaciones?empresa=${p.empresa}`,
          texto: `Publicaciones de ${NOMBRE_EMPRESA[p.empresa]}`,
        }}
        descripcion={`${NOMBRE_AUDIENCIA[p.audiencia]} · /${p.empresa}/${p.slug}`}
      />
      <PublicacionForm empresa={p.empresa} publicacion={p} />
    </div>
  );
}
