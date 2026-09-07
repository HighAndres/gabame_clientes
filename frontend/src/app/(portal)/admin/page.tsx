import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion } from "@/lib/sesion";
import type { ResumenAdmin } from "@/types/admin";

export default async function AdminPage() {
  const r = await apiConSesion<ResumenAdmin>("/admin/resumen");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administracion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {r.alcance_grupo
            ? "Alcance: todo el grupo."
            : `Alcance: ${r.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ")}.`}{" "}
          Matriz provisional hasta que el cliente valide el pendiente 0.2.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {r.medicos_pendientes !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{r.medicos_pendientes}</CardTitle>
              <CardDescription>Medicos por validar</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/medicos" className="text-sm text-primary hover:underline">
                Ver cola
              </Link>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{r.partners_pendientes}</CardTitle>
            <CardDescription>Partners por aprobar</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/partners" className="text-sm text-primary hover:underline">
              Ver cola
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{r.usuarios_total ?? "—"}</CardTitle>
            <CardDescription>{r.usuarios_total === null ? "Usuarios (solo admin_grupo)" : "Usuarios en total"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/usuarios" className="text-sm text-primary hover:underline">
              Ver usuarios
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
