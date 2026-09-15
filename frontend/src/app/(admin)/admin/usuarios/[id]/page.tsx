import { Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AccionesUsuario, RolesForm } from "@/components/admin/acciones-usuario";
import { BitacoraLista } from "@/components/admin/bitacora-lista";
import { Card, CardContent } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { ApiError } from "@/lib/api";
import { alcanceDe, NOMBRE_EMPRESA, NOMBRE_ROL } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { PaginaBitacora, UsuarioAdminOut } from "@/types/admin";

/** Detalle de un usuario en el alcance: datos, roles administrativos, acciones y su historial. */
export default async function AdminUsuarioPage({ params }: { params: { id: string } }) {
  const yo = await leerUsuarioActual();
  if (!yo) return null;
  const a = alcanceDe(yo);
  const id = encodeURIComponent(params.id);

  let u: UsuarioAdminOut;
  let bitacora: PaginaBitacora;
  try {
    [u, bitacora] = await Promise.all([
      apiConSesion<UsuarioAdminOut>(`/admin/usuarios/${id}`),
      apiConSesion<PaginaBitacora>(`/admin/bitacora?objetivo_id=${id}&limit=50`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  const esYo = u.id === yo.id;
  const estado = u.estado_medico ?? u.estado_partner;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoArea
        icono={Users}
        etiqueta="Usuario"
        titulo={`${u.nombre} ${u.apellidos}`}
        volver={{ href: "/admin/usuarios", texto: "Usuarios" }}
        estado={
          <>
            {!u.activo && <Estado tono="rechazado">Inactiva</Estado>}
            {estado && <Estado tono={tonoDeValidacion(estado)} />}
          </>
        }
        descripcion={
          <>
            {u.email}
            {!u.email_verificado ? " · correo sin verificar" : ""}
            {u.telefono ? ` · ${u.telefono}` : ""} · alta el{" "}
            {new Date(u.creado_en).toLocaleDateString("es-MX")} · origen {u.origen_inicial}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-base font-bold">Roles</h2>
            <p className="text-[13px] text-muted-foreground">
              Actuales: {u.roles.map((r) => `${NOMBRE_ROL[r.rol]}${r.empresa ? ` (${NOMBRE_EMPRESA[r.empresa]})` : ""}`).join(", ")}
            </p>
            {u.vinculos.length > 0 && (
              <p className="text-[13px] text-muted-foreground">
                Vínculos:{" "}
                {u.vinculos.map((v) => `${NOMBRE_EMPRESA[v.empresa]} (${v.estado})`).join(", ")} ·{" "}
                <Link href={`/admin/partners/${u.id}`} className="font-bold text-primary hover:text-primary-hover">
                  ver como partner
                </Link>
              </p>
            )}
            <RolesForm usuario={u} grupo={a.grupo} empresas={a.grupo ? a.empresas : a.admin} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <h2 className="text-base font-bold">Cuenta</h2>
            <p className="text-[13px] text-muted-foreground">
              Desactivar cierra sus sesiones y bloquea el inicio de sesión. El restablecimiento envía un enlace al
              correo de la persona; nadie ve ni fija contraseñas desde aquí.
            </p>
            <AccionesUsuario usuario={u} esYo={esYo} />
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Historial ({bitacora.total})</h2>
        <div className="overflow-hidden rounded-lg border bg-card">
          <BitacoraLista items={bitacora.items} conObjetivo={false} />
        </div>
      </section>
    </div>
  );
}
