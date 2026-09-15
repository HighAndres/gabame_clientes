import { Stethoscope } from "lucide-react";
import Link from "next/link";

import { NavLink } from "@/components/portal/nav-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

const ESTADO_TITULO = {
  pendiente: "Tu acreditación está en revisión",
  rechazado: "Tu acreditación no fue aprobada",
};
const ESTADO_TEXTO = {
  pendiente:
    "El contenido técnico se abre en cuanto validemos tu cédula profesional. Te avisamos por correo; mientras tanto puedes revisar y corregir tus datos.",
  rechazado: "En Mi cuenta te decimos por qué y puedes corregir tus datos para que la revisemos otra vez.",
};

/**
 * Area medica: franja de encabezado con el estado de la acreditacion, columna izquierda con las
 * areas terapeuticas y, a la derecha, el contenido. Solo el rol medico llega aqui (middleware);
 * el contenido lo sirve el backend detras de `require_medico_validado`, nunca esta pantalla.
 *
 * Quien todavia no esta validado ve aqui que sigue, no una puerta cerrada: el detalle de su
 * acreditacion (y el boton de reenviar tras un rechazo) vive en Mi cuenta.
 */
export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const u = await leerUsuarioActual();
  if (!u) return null;
  // En una variable propia para que TypeScript pueda estrecharla en las ramas de abajo.
  const estado = u.estado_medico;
  const validado = estado === "validado";

  const encabezado = (
    <EncabezadoArea
      icono={Stethoscope}
      etiqueta="Profesionales de la salud"
      titulo="Área médica"
      descripcion="Información dirigida exclusivamente a profesionales de la salud."
      estado={
        validado ? (
          <Estado tono="validado">Acreditación validada</Estado>
        ) : (
          <Estado tono={tonoDeValidacion(estado)} />
        )
      }
    />
  );

  if (!validado) {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        {encabezado}
        <Alert>
          <AlertTitle>
            {estado === null ? "No encontramos tu acreditación" : ESTADO_TITULO[estado]}
          </AlertTitle>
          <AlertDescription>
            {estado === null
              ? "No hay una acreditación profesional asociada a tu cuenta. Escríbenos y la damos de alta."
              : ESTADO_TEXTO[estado]}
          </AlertDescription>
        </Alert>
        <Link href="/perfil" className="text-sm font-bold text-primary hover:text-primary-hover">
          Ver mi acreditación
        </Link>
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
    <div className="flex flex-col gap-7">
      {encabezado}
      <div className="grid items-start gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          {areas.length > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Áreas terapéuticas
              </p>
              <nav className="flex flex-col gap-1" aria-label="Áreas terapéuticas">
                {areas.map((a) => (
                  <NavLink key={a.id} href={`/medico/${a.slug}`} className="h-10 justify-between">
                    <span>{a.nombre}</span>
                    <span className="text-xs text-muted-foreground">{a.fichas.length}</span>
                  </NavLink>
                ))}
              </nav>
            </>
          ) : (
            <p className="rounded-md border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              Las áreas terapéuticas aparecen aquí conforme el grupo libere el contenido técnico.
            </p>
          )}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
