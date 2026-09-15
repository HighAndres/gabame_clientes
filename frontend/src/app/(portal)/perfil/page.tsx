import { Acreditacion } from "@/components/portal/acreditacion";
import { PerfilForm } from "@/components/portal/perfil-form";
import { NOMBRE_ROL } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AcreditacionOut } from "@/types/medico";

/** Sin datos clinicos: aqui solo identidad, contacto y la acreditacion del profesional. */
export default async function PerfilPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;

  // Su propia acreditacion la ve cualquier medico con perfil, este validado o no: es justo
  // quien esta en revision o rechazado el que necesita consultarla y corregirla.
  let acreditacion: AcreditacionOut | null = null;
  if (u.roles.some((r) => r.rol === "medico")) {
    try {
      acreditacion = await apiConSesion<AcreditacionOut>("/medicos/me/acreditacion");
    } catch {
      acreditacion = null;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {u.roles.map((r) => NOMBRE_ROL[r.rol] + (r.empresa ? ` (${r.empresa})` : "")).join(" · ")}
        </p>
      </div>
      <PerfilForm usuario={u} />
      {acreditacion && <Acreditacion inicial={acreditacion} />}
    </div>
  );
}
