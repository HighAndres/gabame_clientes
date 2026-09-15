import Link from "next/link";

import { AvisoAcceso } from "@/components/portal/aviso-acceso";
import { Fila, Lista, TituloSeccion } from "@/components/ui/lista";
import { leerAviso, PARAM_AVISO } from "@/lib/avisos-acceso";
import { alcanceDe, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { ResumenAdmin } from "@/types/admin";

/**
 * Cifra grande de una cola. Las que tienen algo pendiente se marcan; las que estan en cero se
 * leen igual pero no piden atencion.
 */
function Cifra({
  valor,
  etiqueta,
  href,
  pendiente = false,
}: {
  valor: number | string;
  etiqueta: string;
  href: string;
  pendiente?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-[150px] flex-1 flex-col gap-0.5 rounded-lg border bg-card px-5 py-4 transition-colors hover:bg-background"
    >
      {/* El naranja del sistema (#ef8f00) es el unico acento y solo marca lo pendiente. */}
      <span className={`text-[30px] font-bold leading-tight ${pendiente ? "text-[#9a5a00]" : "text-heading"}`}>
        {valor}
      </span>
      <span className="text-[13px] text-muted-foreground">{etiqueta}</span>
    </Link>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const [u, r] = await Promise.all([leerUsuarioActual(), apiConSesion<ResumenAdmin>("/admin/resumen")]);
  const a = u ? alcanceDe(u) : null;
  const alcance = r.alcance_grupo ? "todo el grupo" : r.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ");
  const aviso = leerAviso(searchParams[PARAM_AVISO]);

  return (
    <div className="flex flex-col gap-7">
      {aviso && <AvisoAcceso motivo={aviso} />}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{alcance} · Resumen</p>
        <h1 className="text-[26px] font-bold">Administración</h1>
        <p className="text-sm text-muted-foreground">Matriz de alcance provisional hasta que el grupo la confirme.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        {r.medicos_pendientes !== null && (
          <Cifra
            valor={r.medicos_pendientes}
            etiqueta={r.medicos_pendientes === 1 ? "médico por validar" : "médicos por validar"}
            href="/admin/medicos"
            pendiente={r.medicos_pendientes > 0}
          />
        )}
        {a?.administraAlguna && (
          <Cifra
            valor={r.partners_pendientes}
            etiqueta={r.partners_pendientes === 1 ? "vínculo por aprobar" : "vínculos por aprobar"}
            href="/admin/partners"
            pendiente={r.partners_pendientes > 0}
          />
        )}
        {a?.administraAlguna && (
          <Cifra
            valor={r.usuarios_total ?? "—"}
            etiqueta={r.usuarios_total === null ? "usuarios (solo admin del grupo)" : "usuarios en total"}
            href="/admin/usuarios"
          />
        )}
      </div>

      <section className="flex flex-col gap-3">
        <TituloSeccion>Qué puedes hacer aquí</TituloSeccion>
        <Lista>
          {a?.veMedicos && (
            <Fila
              href="/admin/medicos"
              titulo="Validar profesionales de la salud"
              meta="Revisar cédula, aprobar o rechazar con motivo; todo queda en la bitácora."
            />
          )}
          {a?.editaContenidoRx && (
            <Fila
              href="/admin/contenido"
              titulo="Contenido para profesionales"
              meta="Áreas terapéuticas y fichas técnicas Rx, con su bandera de publicada."
            />
          )}
          <Fila
            href="/admin/publicaciones"
            titulo="Publicaciones y promociones"
            meta="Lo que cada empresa publica por audiencia, con su vigencia y su enlace."
          />
          {a?.administraAlguna && (
            <Fila
              href="/admin/partners"
              titulo="Vínculos y documentos de partners"
              meta="Aprobar la relación de cada empresa y revisar los documentos que suben."
            />
          )}
          {a?.administraAlguna && (
            <Fila
              href="/admin/usuarios"
              titulo="Cuentas y roles"
              meta="Altas administrativas, activar o desactivar, restablecer contraseña."
            />
          )}
          <Fila
            href="/admin/espacios"
            titulo={a?.grupo || (a?.empresas.length ?? 0) > 1 ? "Espacios de las empresas" : "Mi espacio"}
            meta="Módulos habilitados, contacto comercial y requisitos documentales."
          />
          {a?.administraAlguna && (
            <Fila href="/admin/bitacora" titulo="Bitácora" meta="Quién aprobó qué, cuándo y por qué." />
          )}
        </Lista>
      </section>
    </div>
  );
}
