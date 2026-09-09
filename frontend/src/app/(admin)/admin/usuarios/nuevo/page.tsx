import Link from "next/link";

import { NuevoAdminForm } from "@/components/admin/nuevo-admin-form";
import { alcanceDe } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

/** Alta de cuentas administrativas dentro del alcance del actor (corte 3). */
export default async function NuevoAdminPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const a = alcanceDe(u);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/usuarios" className="text-xs text-muted-foreground hover:text-primary">
          ← Usuarios
        </Link>
        <h1 className="text-[26px] font-bold">Nuevo administrador o editor</h1>
        <p className="text-sm text-muted-foreground">
          La persona recibe un correo con el enlace para establecer su contraseña. Los pacientes, médicos y partners se
          registran solos desde el portal.
        </p>
      </div>
      <NuevoAdminForm grupo={a.grupo} empresas={a.grupo ? a.empresas : a.admin} />
    </div>
  );
}
