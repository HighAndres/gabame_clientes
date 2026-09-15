import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { NavLink } from "@/components/portal/nav-link";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { AreaOut } from "@/types/contenido";

/**
 * Area medica (lienzo aprobado): columna izquierda con las areas terapeuticas y el estado de la
 * acreditacion; a la derecha, el contenido. Solo el rol medico llega aqui (middleware); el
 * contenido lo sirve el backend detras de `require_medico_validado`, nunca esta pantalla.
 */
export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  const u = await leerUsuarioActual();
  if (!u) return null;

  if (u.estado_medico !== "validado") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-[26px] font-bold">Área médica</h1>
        <Alert>
          <AlertTitle>Contenido exclusivo para profesionales de la salud</AlertTitle>
          <AlertDescription>
            {u.estado_medico === "pendiente" &&
              "Tu acreditación profesional está en revisión. Te avisaremos por correo cuando esté validada."}
            {u.estado_medico === "rechazado" &&
              "Tu acreditación no fue aprobada. Si crees que es un error, contacta al equipo del grupo."}
            {u.estado_medico === null && "No encontramos una acreditación profesional asociada a tu cuenta."}
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
    <div className="grid items-start gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-bold">Área médica</h1>
          <Estado tono={tonoDeValidacion(u.estado_medico)} className="self-start">
            Acreditación validada
          </Estado>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Áreas terapéuticas</p>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay áreas publicadas.</p>
        ) : (
          <nav className="flex flex-col gap-1" aria-label="Áreas terapéuticas">
            {areas.map((a) => (
              <NavLink key={a.id} href={`/medico/${a.slug}`} className="h-10 justify-between">
                <span>{a.nombre}</span>
                <span className="text-xs text-muted-foreground">{a.fichas.length}</span>
              </NavLink>
            ))}
          </nav>
        )}
        <p className="rounded-md border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Información dirigida exclusivamente a profesionales de la salud.
        </p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
