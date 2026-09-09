import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { ResumenAdmin } from "@/types/admin";

function Cifra({ valor, etiqueta, href, accion }: { valor: number | string; etiqueta: string; href: string; accion: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <span className="text-xs text-muted-foreground">{etiqueta}</span>
        <span className="text-[28px] font-bold leading-tight text-heading">{valor}</span>
        <Link href={href} className="mt-1 text-sm font-bold text-primary hover:text-primary-hover">
          {accion}
        </Link>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const r = await apiConSesion<ResumenAdmin>("/admin/resumen");
  const alcance = r.alcance_grupo ? "todo el grupo" : r.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{alcance} · Resumen</p>
        <h1 className="text-[26px] font-bold">Administracion</h1>
        <p className="text-sm text-muted-foreground">Matriz de alcance provisional hasta que el grupo la confirme.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {r.medicos_pendientes !== null && (
          <Cifra valor={r.medicos_pendientes} etiqueta="Medicos por validar" href="/admin/medicos" accion="Ver cola" />
        )}
        <Cifra valor={r.partners_pendientes} etiqueta="Partners por aprobar" href="/admin/partners" accion="Ver cola" />
        <Cifra
          valor={r.usuarios_total ?? "—"}
          etiqueta={r.usuarios_total === null ? "Usuarios (solo admin del grupo)" : "Usuarios en total"}
          href="/admin/usuarios"
          accion="Ver usuarios"
        />
      </div>
    </div>
  );
}
