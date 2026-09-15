import { Building2 } from "lucide-react";
import { EspacioForm } from "@/components/admin/espacio-form";
import { RequisitosForm } from "@/components/admin/requisitos-form";
import { Card, CardContent } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EspacioOut, RequisitoDocumentalOut } from "@/types/admin";

/**
 * Configuracion de cada espacio en el alcance: nombre, contacto comercial, portal operativo,
 * modulos (solo admin del grupo) y requisitos documentales (solo quien administra la empresa).
 */
export default async function EspaciosPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;
  const a = alcanceDe(u);
  const espacios = await apiConSesion<EspacioOut[]>("/admin/espacios");
  const requisitos = await Promise.all(
    espacios.map((e) => apiConSesion<RequisitoDocumentalOut[]>(`/admin/espacios/${e.empresa}/requisitos`)),
  );

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoArea
        icono={Building2}
        etiqueta="Espacios"
        titulo={espacios.length === 1 ? "Configuración de tu espacio" : "Configuración por empresa"}
        descripcion="Lo que cada empresa muestra a sus partners y qué módulos tiene habilitados. La marca del portal es la del grupo."
      />

      <div className="flex flex-col gap-6">
        {espacios.map((e, i) => (
          <Card key={e.empresa}>
            <CardContent className="flex flex-col gap-6 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-[13px] font-bold text-heading">
                  {e.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex flex-col">
                  <span className="text-lg font-bold">{e.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.administra ? "Administras esta empresa" : "Editas contenido y contactos"}
                  </span>
                </div>
              </div>
              <EspacioForm espacio={e} puedeModulos={a.grupo} />
              {e.administra && <RequisitosForm empresa={e.empresa} iniciales={requisitos[i]} habilitado={e.modulos.includes("documentos")} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
