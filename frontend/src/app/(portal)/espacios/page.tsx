import { Ecosistema } from "@/components/portal/ecosistema";
import { TarjetaEspacio } from "@/components/portal/tarjeta-espacio";
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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold">Empresas del grupo</h1>
        <p className="text-[15px] text-muted-foreground">
          {partner
            ? "Lo que cada empresa comparte contigo según tu vínculo con ella."
            : "Lo que cada empresa del grupo comparte contigo."}
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {espacios.map((e) => (
          <TarjetaEspacio key={e.empresa} e={e} />
        ))}
      </div>
      <Ecosistema titulo={u.realm === "partners" ? "Sitios y canales oficiales" : "Marcas y tiendas"} />
    </div>
  );
}
