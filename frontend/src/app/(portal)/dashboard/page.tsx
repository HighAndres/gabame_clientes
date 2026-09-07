import Link from "next/link";

import { Ecosistema } from "@/components/portal/ecosistema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { alcanceDe } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

const ESTADO_MEDICO = {
  validado: "Tu acreditacion esta validada.",
  pendiente: "Tu acreditacion profesional esta en revision.",
  rechazado: "Tu acreditacion no fue aprobada.",
};
const ESTADO_PARTNER = {
  validado: "Tu cuenta Partners esta aprobada.",
  pendiente: "Tu cuenta Partners esta pendiente de aprobacion.",
  rechazado: "Tu cuenta Partners no fue aprobada.",
};

/** Dashboard por rol (Fase 3). Matriz provisional hasta 0.2. */
export default async function DashboardPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const roles = u.roles.map((r) => r.rol);
  const admin = alcanceDe(u);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Hola, {u.nombre}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bienvenido a tu Cuenta GABAME.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.includes("medico") && (
          <Card>
            <CardHeader>
              <CardTitle>Area medica</CardTitle>
              <CardDescription>{u.estado_medico ? ESTADO_MEDICO[u.estado_medico] : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/medico" className="text-sm text-primary hover:underline">
                Ir al area medica
              </Link>
            </CardContent>
          </Card>
        )}
        {roles.includes("partner") && (
          <Card>
            <CardHeader>
              <CardTitle>GABAME Partners</CardTitle>
              <CardDescription>{u.estado_partner ? ESTADO_PARTNER[u.estado_partner] : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/partner" className="text-sm text-primary hover:underline">
                Ir a Partners
              </Link>
            </CardContent>
          </Card>
        )}
        {admin.esAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Administracion</CardTitle>
              <CardDescription>
                {admin.grupo ? "Alcance: todo el grupo." : `Alcance: ${admin.empresas.join(", ")}.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin" className="text-sm text-primary hover:underline">
                Ver colas de validacion
              </Link>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Mi cuenta</CardTitle>
            <CardDescription>Datos de contacto y seguridad.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/perfil" className="text-sm text-primary hover:underline">
              Editar mi cuenta
            </Link>
          </CardContent>
        </Card>
      </div>

      <Ecosistema titulo={u.realm === "partners" ? "Empresas y canales del grupo" : "Marcas y tiendas del grupo"} />
    </div>
  );
}
