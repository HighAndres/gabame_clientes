import { ArrowUpRight, Briefcase } from "lucide-react";
import Link from "next/link";

import { SolicitarVinculo } from "@/components/partner/solicitar-vinculo";
import { FilaRequisito } from "@/components/partner/subir-documento";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { ApiError } from "@/lib/api";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { EstadoPartnerOut, VinculoOut } from "@/types/partner";
import { NOMBRE_SUBTIPO, TEXTO_VINCULO } from "@/types/partner";

/**
 * Area Partners (ADR-0008): una tarjeta por empresa del grupo con la que la razon social se
 * relaciona, cada una con su estado y, cuando esta aprobada, su contacto comercial. Debajo, los
 * documentos, que son de la razon social y los revisa cualquiera de esas empresas.
 * # Pendiente 0.4 — requisitos documentales provisionales del backend.
 * # Pendiente — contactos y portales operativos: los captura cada empresa en su espacio.
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
      <div className="flex max-w-2xl flex-col gap-6">
        <EncabezadoArea icono={Briefcase} etiqueta="GABAME Partners" titulo="GABAME Partners" />
        <Alert>
          <AlertTitle>Sin perfil de partner</AlertTitle>
          <AlertDescription>No encontramos un perfil de partner asociado a tu cuenta.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const obligatorios = p.requisitos.filter((r) => r.obligatorio);
  const aceptados = obligatorios.filter((r) => r.documentos.some((d) => d.estado === "validado")).length;

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoArea
        icono={Briefcase}
        etiqueta="GABAME Partners"
        titulo={p.razon_social}
        descripcion={p.rfc ? `RFC ${p.rfc}` : undefined}
        acciones={<SolicitarVinculo disponibles={p.empresas_disponibles} />}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Empresas con las que trabajas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {p.vinculos.map((v) => (
            <TarjetaVinculo key={v.id} v={v} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-bold">Documentos</h2>
          <span className="text-[13px] text-muted-foreground">
            {aceptados} de {obligatorios.length} obligatorios aceptados
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[minmax(0,1fr)_170px_120px_140px] bg-background px-5 py-3 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground md:grid">
            <span>Requisito</span>
            <span>Archivo</span>
            <span>Estado</span>
            <span />
          </div>
          {p.requisitos.map((r) => (
            <FilaRequisito
              key={r.tipo}
              tipo={r.tipo}
              nombre={r.nombre}
              descripcion={r.descripcion}
              obligatorio={r.obligatorio}
              documentos={r.documentos}
              limiteMb={p.limite_mb}
              tiposPermitidos={p.tipos_permitidos}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          PDF, JPG o PNG, hasta {p.limite_mb} MB por archivo. Los mismos documentos sirven para todas las empresas con las que
          trabajas. Lista provisional hasta que el grupo confirme los requisitos por tipo de partner.
        </p>
      </section>
    </div>
  );
}

function TarjetaVinculo({ v }: { v: VinculoOut }) {
  const aprobado = v.estado === "validado";
  return (
    <Card className={v.estado === "rechazado" ? "border-[#f0c9c9]" : undefined}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-background text-[13px] font-bold text-heading">
              {v.empresa_nombre.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-bold">{v.empresa_nombre}</span>
              <span className="text-xs text-muted-foreground">{NOMBRE_SUBTIPO[v.tipo]}</span>
            </span>
          </div>
          <Estado tono={tonoDeValidacion(v.estado)}>{TEXTO_VINCULO[v.estado]}</Estado>
        </div>

        {v.estado === "pendiente" && (
          <p className="text-[13px] text-muted-foreground">
            El equipo de {v.empresa_nombre} revisara tu solicitud y tus documentos. Te avisaremos por correo.
          </p>
        )}
        {v.estado === "rechazado" && (
          <p className="text-[13px] text-[#b03535]">{v.motivo_rechazo ?? "Contacta al equipo comercial de la empresa."}</p>
        )}
        {aprobado && v.aprobado_en && (
          <p className="text-[13px] text-muted-foreground">Aprobado el {new Date(v.aprobado_en).toLocaleDateString("es-MX")}.</p>
        )}
        {aprobado && (
          <Link href={`/espacios/${v.empresa}`} className="text-sm font-bold text-primary hover:text-primary-hover">
            Entrar al espacio de {v.empresa_nombre}
          </Link>
        )}

        {aprobado && v.contacto && (
          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">Contacto comercial</span>
            {v.contacto.pendiente ? (
              <span className="text-[13px] text-muted-foreground">Por confirmar.</span>
            ) : (
              <>
                {v.contacto.nombre && <span>{v.contacto.nombre}</span>}
                {v.contacto.email && <a href={`mailto:${v.contacto.email}`} className="text-primary hover:text-primary-hover">{v.contacto.email}</a>}
                {v.contacto.telefono && <span>{v.contacto.telefono}</span>}
                {v.contacto.portal_url && (
                  <a
                    href={v.contacto.portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-bold text-primary hover:text-primary-hover"
                  >
                    Portal operativo <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
