import Link from "next/link";

import { AvisoAcceso } from "@/components/portal/aviso-acceso";
import { Ecosistema } from "@/components/portal/ecosistema";
import { Novedades } from "@/components/portal/novedades";
import { TarjetaEspacio } from "@/components/portal/tarjeta-espacio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { leerAviso, PARAM_AVISO } from "@/lib/avisos-acceso";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EspacioMioOut } from "@/types/espacios";

const ESTADO_MEDICO = {
  pendiente: "Tu acreditación profesional está en revisión.",
  rechazado: "Tu acreditación no fue aprobada. Corrígela y vuelve a enviarla.",
};
const ESTADO_VINCULO = { validado: "aprobado", pendiente: "en revisión", rechazado: "no aprobado" };

function Tarjeta({
  titulo,
  descripcion,
  href,
  accion,
  chip,
}: {
  titulo: string;
  descripcion: string;
  href: string;
  accion: string;
  chip?: React.ReactNode;
}) {
  return (
    <Card className="tarjeta-enlace">
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

/** Un espacio con nada dentro no es una tarjeta, es ruido. */
function tieneAlgoQueVer(e: EspacioMioOut): boolean {
  return e.publicaciones.length > 0 || e.contacto !== null || e.portal_url !== null;
}

/** Inicio por rol (lienzo aprobado). Matriz provisional hasta 0.2. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const roles = u.roles.map((r) => r.rol);
  const admin = alcanceDe(u);
  let espacios: EspacioMioOut[] = [];
  try {
    espacios = await apiConSesion<EspacioMioOut[]>("/espacios/mios");
  } catch {
    espacios = [];
  }
  const conContenido = espacios.filter(tieneAlgoQueVer);

  // El area medica ya vive en la navegacion: aqui solo aparece cuando hay algo que resolver.
  const acreditacionPendiente =
    roles.includes("medico") && (u.estado_medico === "pendiente" || u.estado_medico === "rechazado");

  const aviso = leerAviso(searchParams[PARAM_AVISO]);

  return (
    <div className="flex flex-col gap-9">
      {aviso && <AvisoAcceso motivo={aviso} />}
      <div className="flex flex-col gap-1.5 aparece">
        <h1 className="text-3xl font-bold">Hola, {u.nombre}</h1>
        <p className="text-[15px] text-muted-foreground">Bienvenido a tu Cuenta GABAME.</p>
      </div>

      {(acreditacionPendiente || roles.includes("partner") || admin.esAdmin) && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {acreditacionPendiente && (
            <Tarjeta
              titulo="Acreditación profesional"
              descripcion={ESTADO_MEDICO[u.estado_medico as "pendiente" | "rechazado"]}
              href="/perfil"
              accion={u.estado_medico === "rechazado" ? "Corregir y reenviar" : "Ver mi acreditación"}
              chip={<Estado tono={tonoDeValidacion(u.estado_medico)} />}
            />
          )}
          {roles.includes("partner") && (
            <Tarjeta
              titulo="GABAME Partners"
              descripcion={u.vinculos
                .map((v) => `${NOMBRE_EMPRESA[v.empresa]}: ${ESTADO_VINCULO[v.estado]}`)
                .join(" · ")}
              href="/partner"
              accion="Ir a Partners"
              chip={<Estado tono={tonoDeValidacion(u.estado_partner)} />}
            />
          )}
          {admin.esAdmin && (
            <Tarjeta
              titulo="Administración"
              descripcion={
                admin.grupo
                  ? "Alcance: todo el grupo."
                  : `Alcance: ${admin.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ")}.`
              }
              href="/admin"
              accion="Ir a administración"
            />
          )}
        </div>
      )}

      <Novedades espacios={espacios} />

      {conContenido.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold">Empresas del grupo</h2>
            <Link href="/espacios" className="text-[13px] font-bold text-primary hover:text-primary-hover">
              Ver todas
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {conContenido.map((e) => (
              <TarjetaEspacio key={e.empresa} e={e} />
            ))}
          </div>
        </section>
      )}

      <Ecosistema titulo={u.realm === "partners" ? "Sitios y canales oficiales" : "Marcas y tiendas del grupo"} />
    </div>
  );
}
