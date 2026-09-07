import { SubirDocumento } from "@/components/partner/subir-documento";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { NOMBRE_EMPRESA } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EstadoPartnerOut } from "@/types/partner";

const SUBTIPO = { distribuidor: "Distribuidor", mayorista: "Mayorista", institucional: "Cliente institucional" };

/**
 * Area Partners (Fase 5).
 * # Pendiente 0.4 — los requisitos documentales son el catalogo provisional del backend.
 * # Pendiente — contactos comerciales y portales operativos: los entrega el cliente.
 */
export default async function PartnerPage() {
  const u = await leerUsuarioActual();
  if (!u) return null;

  let p: EstadoPartnerOut | null = null;
  try {
    p = await apiConSesion<EstadoPartnerOut>("/partners/me");
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 403)) throw e;
  }

  if (!p) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">GABAME Partners</h1>
        <Alert>
          <AlertTitle>Sin perfil de partner</AlertTitle>
          <AlertDescription>No encontramos un perfil de partner asociado a tu cuenta.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const aprobado = p.estado === "validado";
  const obligatoriosSinAceptar = p.requisitos.filter(
    (r) => r.obligatorio && !r.documentos.some((d) => d.estado === "validado"),
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{p.razon_social}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {SUBTIPO[p.subtipo]} · {NOMBRE_EMPRESA[p.empresa_objetivo]}
          {p.rfc ? ` · RFC ${p.rfc}` : ""}
        </p>
      </div>

      {p.estado === "pendiente" && (
        <Alert>
          <AlertTitle>Cuenta pendiente de aprobacion</AlertTitle>
          <AlertDescription>
            Sube los documentos requeridos. El equipo de {NOMBRE_EMPRESA[p.empresa_objetivo]} los revisara y te
            avisaremos por correo.
            {obligatoriosSinAceptar > 0 && ` Faltan ${obligatoriosSinAceptar} documentos obligatorios por aceptar.`}
          </AlertDescription>
        </Alert>
      )}
      {p.estado === "rechazado" && (
        <Alert variant="destructive">
          <AlertTitle>Solicitud no aprobada</AlertTitle>
          <AlertDescription>{p.motivo_rechazo ?? "Contacta al equipo comercial de la empresa."}</AlertDescription>
        </Alert>
      )}
      {aprobado && (
        <Alert>
          <AlertTitle>Cuenta aprobada</AlertTitle>
          <AlertDescription>
            {p.aprobado_en
              ? `Aprobada el ${new Date(p.aprobado_en).toLocaleDateString("es-MX")}.`
              : "Tu cuenta esta activa. Manten tus documentos vigentes."}
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos</h2>
        <p className="text-sm text-muted-foreground">
          {/* Pendiente 0.4 — lista provisional; el cliente define los requisitos por tipo de partner */}
          Requisitos para {SUBTIPO[p.subtipo].toLowerCase()}. Lista provisional hasta que el grupo confirme los
          requisitos por tipo de partner.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {p.requisitos.map((r) => (
            <Card key={r.tipo}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {r.nombre}
                  {r.obligatorio && <span className="ml-2 text-xs font-normal text-muted-foreground">obligatorio</span>}
                </CardTitle>
                <CardDescription>{r.descripcion}</CardDescription>
              </CardHeader>
              <CardContent>
                <SubirDocumento tipo={r.tipo} documentos={r.documentos} limiteMb={p.limite_mb} tiposPermitidos={p.tipos_permitidos} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {aprobado && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Contactos comerciales y portales operativos</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {p.contactos.map((c) => (
              <Card key={c.empresa} className={c.pendiente ? "opacity-70" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{NOMBRE_EMPRESA[c.empresa]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-muted-foreground">
                  {c.pendiente ? (
                    <p>Contacto comercial por confirmar.</p>
                  ) : (
                    <>
                      {c.nombre && <p>{c.nombre}</p>}
                      {c.email && <p>{c.email}</p>}
                      {c.telefono && <p>{c.telefono}</p>}
                      {c.portal_url && (
                        <a href={c.portal_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Portal operativo ↗
                        </a>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
