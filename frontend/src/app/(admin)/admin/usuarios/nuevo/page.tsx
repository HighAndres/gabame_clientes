import { Users } from "lucide-react";
import Link from "next/link";

import { NuevoAdminForm } from "@/components/admin/nuevo-admin-form";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { alcanceDe } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

/** Alta de cuentas administrativas dentro del alcance del actor (corte 3). */
export default async function NuevoAdminPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const a = alcanceDe(u);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoArea
        icono={Users}
        etiqueta="Usuarios"
        titulo="Nuevo administrador o editor"
        volver={{ href: "/admin/usuarios", texto: "Usuarios" }}
        descripcion="La persona recibe un correo con el enlace para establecer su contraseña. Los pacientes, médicos y partners se registran solos desde el portal."
      />
      <NuevoAdminForm grupo={a.grupo} empresas={a.grupo ? a.empresas : a.admin} />
    </div>
  );
}
