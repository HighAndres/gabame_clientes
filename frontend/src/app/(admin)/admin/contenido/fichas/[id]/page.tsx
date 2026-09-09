import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FichaForm } from "@/components/admin/ficha-form";
import { ApiError } from "@/lib/api";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { FichaOut } from "@/types/contenido";

export default async function EditarFichaPage({ params }: { params: { id: string } }) {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  let ficha: FichaOut;
  try {
    ficha = await apiConSesion<FichaOut>(`/admin/contenido/fichas/${encodeURIComponent(params.id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/contenido" className="text-xs text-muted-foreground hover:underline">
          ← Contenido Rx
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{ficha.nombre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ficha.area_nombre} · /medico/{ficha.area_slug}/{ficha.slug}
        </p>
      </div>
      <FichaForm ficha={ficha} />
    </div>
  );
}
