import Link from "next/link";

import { NavLink } from "@/components/portal/nav-link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/**
 * Area medica: columna izquierda con las areas terapeuticas y el estado de la acreditacion;
 * a la derecha, el contenido. Solo el rol medico llega aqui (middleware); el contenido lo
 * sirve el backend detras de `require_medico_validado`, nunca esta pantalla.
 *
 * Quien todavia no esta validado ve aqui que sigue, no una puerta cerrada: el detalle de su
 * acreditacion (y el boton de reenviar tras un rechazo) vive en Mi cuenta.
 */
export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const u = await leerUsuarioActual();
  if (!u) return null;

  if (u.estado_medico !== "validado") {
    return (
      <div className="flex max-w-2xl flex-col gap-6">
        <h1 className="text-[26px] font-bold">Área médica</h1>
        <Alert>
          <AlertTitle>
            {u.estado_medico === "pendiente" && "Tu acreditación está en revisión"}
            {u.estado_medico === "rechazado" && "Tu acreditación no fue aprobada"}
            {u.estado_medico === null && "No encontramos tu acreditación"}
          </AlertTitle>
          <AlertDescription>
            {u.estado_medico === "pendiente" &&
              "El contenido técnico se abre en cuanto validemos tu cédula profesional. Te avisamos por correo; mientras tanto puedes revisar y corregir tus datos."}
            {u.estado_medico === "rechazado" &&
              "En Mi cuenta te decimos por qué y puedes corregir tus datos para que la revisemos otra vez."}
            {u.estado_medico === null &&
              "No hay una acreditación profesional asociada a tu cuenta. Escríbenos y la damos de alta."}
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
    <div className="grid items-start gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-bold">Área médica</h1>
          <Estado tono={tonoDeValidacion(u.estado_medico)} className="self-start">
            Acreditación validada
          </Estado>
        </div>
        {areas.length > 0 && (
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
        )}
        <p className="rounded-md border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Información dirigida exclusivamente a profesionales de la salud.
        </p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
