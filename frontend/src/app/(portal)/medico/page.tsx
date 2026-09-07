import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/**
 * Area medica (Fase 4). El middleware deja pasar al rol `medico`; el interstitial se muestra a
 * quien no esta validado. El contenido lo sirve el backend detras de `require_medico_validado`:
 * esta pantalla nunca es la puerta.
 * # Pendiente 0.5 — las areas y fichas las carga el admin de contenido cuando el cliente las entregue.
 */
export default async function MedicoPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;

  if (u.estado_medico !== "validado") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Area medica</h1>
        <Alert>
          <AlertTitle>Contenido exclusivo para profesionales de la salud</AlertTitle>
          <AlertDescription>
            {u.estado_medico === "pendiente" &&
              "Tu acreditacion profesional esta en revision. Te avisaremos por correo cuando este validada."}
            {u.estado_medico === "rechazado" &&
              "Tu acreditacion no fue aprobada. Si crees que es un error, contacta al equipo del grupo."}
            {u.estado_medico === null && "No encontramos una acreditacion profesional asociada a tu cuenta."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  let areas: AreaOut[] = [];
  try {
    areas = await apiConSesion<AreaOut[]>("/medicos/areas");
  } catch {
    areas = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Area medica</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Informacion tecnica del portafolio Rx del grupo, exclusiva para profesionales de la salud acreditados.
        </p>
      </div>

      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aun no hay contenido publicado. Las fichas tecnicas se publican por area terapeutica conforme el
          grupo las libere.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-base">{a.nombre}</CardTitle>
                <CardDescription>
                  {a.fichas.length} {a.fichas.length === 1 ? "ficha" : "fichas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {a.descripcion && <p className="text-muted-foreground">{a.descripcion}</p>}
                <Link href={`/medico/${a.slug}`} className="text-primary hover:underline">
                  Ver fichas
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
