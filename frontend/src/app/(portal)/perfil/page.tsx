import { PerfilForm } from "@/components/portal/perfil-form";
import { leerUsuarioActual } from "@/lib/sesion";

const NOMBRE_ROL: Record<string, string> = {
  paciente: "Paciente / consumidor",
  medico: "Profesional de la salud",
  partner: "Partner",
  admin_empresa: "Administrador de empresa",
  admin_grupo: "Administrador del grupo",
};

/** Sin datos clinicos: aqui solo identidad y contacto. */
export default async function PerfilPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {u.roles.map((r) => NOMBRE_ROL[r.rol] + (r.empresa ? ` (${r.empresa})` : "")).join(" · ")}
          {" · "}
          {u.realm === "id" ? "GABAME ID" : "GABAME Partners"}
        </p>
      </div>
      <PerfilForm usuario={u} />
    </div>
  );
}
