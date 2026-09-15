import { AvisoAcceso } from "@/components/portal/aviso-acceso";
import { BloquePrincipal, type DatoBloque } from "@/components/portal/bloque-principal";
import { Ecosistema } from "@/components/portal/ecosistema";
import { Novedades } from "@/components/portal/novedades";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { Fila, Lista, TituloSeccion } from "@/components/ui/lista";
import { leerAviso, PARAM_AVISO } from "@/lib/avisos-acceso";
import { alcanceDe, EMPRESA_DUENA_MEDICOS, NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { ResumenAdmin } from "@/types/admin";
import type { UsuarioOut } from "@/types/auth";
import type { EspacioMioOut } from "@/types/espacios";
import { TEXTO_VINCULO } from "@/types/partner";

const ESTADO_MEDICO = {
  pendiente: "Tu acreditación profesional está en revisión.",
  rechazado: "Tu acreditación no fue aprobada. Corrígela y vuelve a enviarla.",
};

/** Un espacio con nada dentro no es una fila, es ruido. */
function tieneAlgoQueVer(e: EspacioMioOut): boolean {
  return e.publicaciones.length > 0 || e.contacto !== null || e.portal_url !== null;
}

/** Lo que una empresa tiene para esta persona, dicho en una linea. */
function resumenEspacio(e: EspacioMioOut): string {
  const n = e.publicaciones.length;
  const partes = [n === 0 ? "Sin publicaciones" : `${n} ${n === 1 ? "publicación" : "publicaciones"}`];
  if (e.contacto && !e.contacto.pendiente) partes.push("contacto comercial");
  return partes.join(" · ");
}

/** Promociones de Farmacias GABAME vigentes para el medico (mismo criterio que el area medica). */
function promocionesDe(espacios: EspacioMioOut[]): number {
  const gabame = espacios.find((e) => e.empresa === EMPRESA_DUENA_MEDICOS);
  if (!gabame) return 0;
  return gabame.publicaciones.filter((p) => p.audiencia === "medicos" && (p.url_externa || p.vigencia_hasta)).length;
}

/**
 * El bloque con el que abre el inicio: lo que esta persona viene a hacer, con su estado y sus
 * cifras dentro. Uno solo, por orden de urgencia: primero lo que hay que resolver, luego el rol
 * con el que se trabaja. El resto de las secciones sigue en la navegacion, no se duplica aqui.
 */
async function bloqueDe(u: UsuarioOut, espacios: EspacioMioOut[]) {
  const roles = u.roles.map((r) => r.rol);
  const admin = alcanceDe(u);

  if (roles.includes("medico") && (u.estado_medico === "pendiente" || u.estado_medico === "rechazado")) {
    return (
      <BloquePrincipal
        etiqueta="Pendiente"
        titulo="Acreditación profesional"
        descripcion={ESTADO_MEDICO[u.estado_medico]}
        estado={<Estado tono={tonoDeValidacion(u.estado_medico)} />}
        href="/perfil"
        accion={u.estado_medico === "rechazado" ? "Corregir y reenviar" : "Ver mi acreditación"}
      />
    );
  }

  if (admin.esAdmin) {
    let r: ResumenAdmin | null = null;
    try {
      r = await apiConSesion<ResumenAdmin>("/admin/resumen");
    } catch {
      r = null;
    }
    const datos: DatoBloque[] = [];
    if (r) {
      if (r.medicos_pendientes !== null) {
        datos.push({ valor: r.medicos_pendientes, etiqueta: "Médicos por validar", href: "/admin/medicos" });
      }
      if (admin.administraAlguna) {
        datos.push({ valor: r.partners_pendientes, etiqueta: "Vínculos por aprobar", href: "/admin/partners" });
        datos.push({ valor: r.usuarios_total ?? "—", etiqueta: "Usuarios", href: "/admin/usuarios" });
      }
    }
    return (
      <BloquePrincipal
        etiqueta="Administración"
        titulo={admin.grupo ? "Todo el grupo" : admin.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ")}
        descripcion="Colas de revisión, contenido y cuentas de tu alcance."
        datos={datos}
        href="/admin"
        accion="Ir a administración"
      />
    );
  }

  if (roles.includes("medico") && u.estado_medico === "validado") {
    const promociones = promocionesDe(espacios);
    return (
      <BloquePrincipal
        etiqueta="Área médica"
        titulo="Portafolio Rx y Farmacias GABAME"
        descripcion="Contenido técnico e información para profesionales de la salud."
        estado={<Estado tono="validado">Acreditación validada</Estado>}
        datos={
          promociones > 0
            ? [{ valor: promociones, etiqueta: promociones === 1 ? "promoción vigente" : "promociones vigentes" }]
            : []
        }
        href="/medico"
        accion="Entrar al área médica"
      />
    );
  }

  if (roles.includes("partner")) {
    const aprobados = u.vinculos.filter((v) => v.estado === "validado").length;
    return (
      <BloquePrincipal
        etiqueta="GABAME Partners"
        titulo="Tus empresas y documentos"
        // Sin chip agregado: decir "Validado" cuando una empresa sigue en revision confunde.
        // El estado real es uno por empresa y va aqui, empresa por empresa.
        descripcion={u.vinculos.map((v) => `${NOMBRE_EMPRESA[v.empresa]}: ${TEXTO_VINCULO[v.estado].toLowerCase()}`).join(" · ")}
        datos={[
          { valor: aprobados, etiqueta: aprobados === 1 ? "vínculo aprobado" : "vínculos aprobados" },
          { valor: u.vinculos.length, etiqueta: "empresas en total" },
        ]}
        href="/partner"
        accion="Ir a Partners"
      />
    );
  }

  return null;
}

/** Inicio por rol (lienzo aprobado). Matriz provisional hasta 0.2. */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u) return null;

  let espacios: EspacioMioOut[] = [];
  try {
    espacios = await apiConSesion<EspacioMioOut[]>("/espacios/mios");
  } catch {
    espacios = [];
  }
  const conContenido = espacios.filter(tieneAlgoQueVer);
  const bloque = await bloqueDe(u, espacios);
  const aviso = leerAviso(searchParams[PARAM_AVISO]);

  return (
    <div className="flex flex-col gap-8">
      {aviso && <AvisoAcceso motivo={aviso} />}
      <div className="aparece flex flex-col gap-1.5">
        <h1 className="text-3xl font-bold">Hola, {u.nombre}</h1>
        <p className="text-[15px] text-muted-foreground">Bienvenido a tu Cuenta GABAME.</p>
      </div>

      {bloque}

      <Novedades espacios={espacios} />

      {conContenido.length > 0 && (
        <section className="flex flex-col gap-3">
          <TituloSeccion href="/espacios" accion="Ver todas">
            Empresas del grupo
          </TituloSeccion>
          <Lista>
            {conContenido.map((e) => (
              <Fila
                key={e.empresa}
                href={`/espacios/${e.empresa}`}
                titulo={e.nombre}
                meta={resumenEspacio(e)}
                derecha={
                  e.vinculo_estado ? (
                    <Estado tono={tonoDeValidacion(e.vinculo_estado)}>{TEXTO_VINCULO[e.vinculo_estado]}</Estado>
                  ) : undefined
                }
              />
            ))}
          </Lista>
        </section>
      )}

      <Ecosistema titulo={u.realm === "partners" ? "Sitios y canales oficiales" : "Marcas y tiendas del grupo"} />
    </div>
  );
}
