import { Building2 } from "lucide-react";

import { Ecosistema } from "@/components/portal/ecosistema";
import { TarjetaEspacio } from "@/components/portal/tarjeta-espacio";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EspacioMioOut } from "@/types/espacios";

/** Las empresas del grupo dentro del portal: cada una con lo que la persona puede ver (corte 4). */
export default async function EspaciosPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const espacios = await apiConSesion<EspacioMioOut[]>("/espacios/mios");
  const partner = u.roles.some((r) => r.rol === "partner");

  return (
    <div className="flex flex-col gap-9">
      <EncabezadoArea
        icono={Building2}
        etiqueta="El grupo"
        titulo="Empresas del grupo"
        descripcion={
          partner
            ? "Lo que cada empresa comparte contigo según tu vínculo con ella."
            : "Lo que cada empresa del grupo comparte contigo."
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {espacios.map((e) => (
          <TarjetaEspacio key={e.empresa} e={e} />
        ))}
      </div>
      <Ecosistema titulo={u.realm === "partners" ? "Sitios y canales oficiales" : "Marcas y tiendas"} />
    </div>
  );
}
