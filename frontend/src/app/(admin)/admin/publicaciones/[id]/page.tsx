import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicacionForm } from "@/components/admin/publicacion-form";
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
      <div className="flex flex-col gap-1">
        <Link href={`/admin/publicaciones?empresa=${p.empresa}`} className="text-xs text-muted-foreground hover:text-primary">
          ← Publicaciones de {NOMBRE_EMPRESA[p.empresa]}
        </Link>
        <h1 className="text-[26px] font-bold">{p.titulo}</h1>
        <p className="text-sm text-muted-foreground">
          {NOMBRE_AUDIENCIA[p.audiencia]} · /{p.empresa}/{p.slug}
        </p>
      </div>
      <PublicacionForm empresa={p.empresa} publicacion={p} />
    </div>
  );
}
