import Link from "next/link";

import { Ecosistema } from "@/components/portal/ecosistema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

const ESTADO_MEDICO = {
  validado: "Tu acreditacion esta validada.",
  pendiente: "Tu acreditacion profesional esta en revision.",
  rechazado: "Tu acreditacion no fue aprobada.",
};
const ESTADO_VINCULO = { validado: "aprobado", pendiente: "en revision", rechazado: "no aprobado" };

function Tarjeta({ titulo, descripcion, href, accion, chip }: { titulo: string; descripcion: string; href: string; accion: string; chip?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{titulo}</CardTitle>
          {chip}
        </div>
        <CardDescription>{descripcion}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href} className="text-sm font-bold text-primary hover:text-primary-hover">
          {accion}
        </Link>
      </CardContent>
    </Card>
  );
}

/** Inicio por rol (lienzo aprobado). Matriz provisional hasta 0.2. */
export default async function DashboardPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const roles = u.roles.map((r) => r.rol);
  const admin = alcanceDe(u);
  const saludo = u.nombre;

  return (
    <div className="flex flex-col gap-9">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold">Hola, {saludo}</h1>
        <p className="text-[15px] text-muted-foreground">Bienvenido a tu Cuenta GABAME.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {roles.includes("medico") && (
          <Tarjeta
            titulo="Area medica"
            descripcion={u.estado_medico ? ESTADO_MEDICO[u.estado_medico] : ""}
            href="/medico"
            accion="Ir al area medica"
            chip={<Estado tono={tonoDeValidacion(u.estado_medico)} />}
          />
        )}
        {roles.includes("partner") && (
          <Tarjeta
            titulo="GABAME Partners"
            descripcion={u.vinculos.map((v) => `${NOMBRE_EMPRESA[v.empresa]}: ${ESTADO_VINCULO[v.estado]}`).join(" · ")}
            href="/partner"
            accion="Ir a Partners"
            chip={<Estado tono={tonoDeValidacion(u.estado_partner)} />}
          />
        )}
        {admin.esAdmin && (
          <Tarjeta
            titulo="Administracion"
            descripcion={admin.grupo ? "Alcance: todo el grupo." : `Alcance: ${admin.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ")}.`}
            href="/admin"
            accion="Ir a administracion"
          />
        )}
        <Tarjeta
          titulo="Mi cuenta"
          descripcion="Nombre, telefono y contrasena."
          href="/perfil"
          accion="Editar mi cuenta"
          chip={u.email_verificado ? <Estado tono="validado">Correo verificado</Estado> : <Estado tono="pendiente">Correo sin verificar</Estado>}
        />
      </div>

      <Ecosistema titulo={u.realm === "partners" ? "Empresas y canales del grupo" : "Marcas y tiendas del grupo"} />
    </div>
  );
}
