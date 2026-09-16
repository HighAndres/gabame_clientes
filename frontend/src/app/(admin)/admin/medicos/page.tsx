import { Stethoscope } from "lucide-react";
import { redirect } from "next/navigation";

import { BarraFiltros } from "@/components/admin/barra-filtros";
import { DecisionBotones } from "@/components/admin/decision-botones";
import { Celda, FilaTabla, Tabla } from "@/components/admin/tabla";
import { EncabezadoArea } from "@/components/ui/encabezado-area";
import { Estado, tonoDeValidacion } from "@/components/ui/estado";
import { fecha } from "@/lib/fechas";
import { alcanceDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { MedicoAdminOut } from "@/types/admin";
import type { EstadoValidacion } from "@/types/auth";

const ESTADOS: { valor: EstadoValidacion; texto: string }[] = [
  { valor: "pendiente", texto: "Pendientes" },
  { valor: "validado", texto: "Validados" },
  { valor: "rechazado", texto: "Rechazados" },
];

const COLUMNAS = "minmax(0,1.4fr) minmax(0,1.3fr) 110px minmax(0,1fr) 96px 230px";

function texto(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

/**
 * Cola de validacion de medicos. La cedula se muestra aqui porque es lo que el admin valida;
 * es una vista interna solo para admins con alcance (ADR-0004). Aprobacion manual (pendiente 0.3).
 */
export default async function AdminMedicosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const u = await leerUsuarioActual();
  if (!u || !alcanceDe(u).veMedicos) redirect("/admin");

  const estadoParam = texto(searchParams.estado);
  const estado = (ESTADOS.some((e) => e.valor === estadoParam) ? estadoParam : "pendiente") as EstadoValidacion;
  const buscar = texto(searchParams.buscar);
  const query = new URLSearchParams({ estado });
  if (buscar) query.set("buscar", buscar);
  const medicos = await apiConSesion<MedicoAdminOut[]>(`/admin/medicos?${query}`);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoArea icono={Stethoscope} etiqueta="GABAME · Médicos" titulo="Acreditaciones profesionales" />

      <BarraFiltros
        accion="/admin/medicos"
        busqueda={{ nombre: "buscar", valor: buscar, placeholder: "Nombre, correo o cédula" }}
        selects={[
          {
            nombre: "estado",
            etiqueta: "Estado",
            valor: estado,
            opciones: ESTADOS.map((e) => ({ valor: e.valor, texto: e.texto })),
          },
        ]}
      />

      <Tabla
        columnas={COLUMNAS}
        cabeceras={["Profesional", "Contacto", "Cédula", "Especialidad", "Solicitud", ""]}
        cantidad={medicos.length}
        vacio={buscar ? "Nadie coincide con la búsqueda." : "Nadie en este estado."}
        pie={<span>{medicos.length} {medicos.length === 1 ? "solicitud" : "solicitudes"}</span>}
      >
        {medicos.map((m) => (
          <FilaTabla key={m.usuario_id}>
            <Celda>
              <span className="truncate font-bold">
                {m.nombre} {m.apellidos}
              </span>
              <span className="truncate text-xs text-muted-foreground">{m.institucion ?? "Institución no indicada"}</span>
            </Celda>
            <Celda etiqueta="Contacto">
              <span className="truncate">{m.email}</span>
              <span className="text-xs text-muted-foreground">{m.telefono ?? "Sin teléfono"}</span>
            </Celda>
            <Celda etiqueta="Cédula">
              <span className="font-mono text-[13px]">{m.cedula_profesional}</span>
            </Celda>
            <Celda etiqueta="Especialidad">
              <span className="truncate">{m.especialidad ?? "—"}</span>
            </Celda>
            <Celda etiqueta="Solicitud">
              <span className="text-muted-foreground">{fecha(m.creado_en)}</span>
            </Celda>
            <Celda className="gap-1.5 pt-1 xl:items-end xl:pt-0">
              {m.estado !== "pendiente" && <Estado tono={tonoDeValidacion(m.estado)} />}
              {m.motivo_rechazo && <span className="text-xs text-destructive xl:text-right">{m.motivo_rechazo}</span>}
              <DecisionBotones
                estado={m.estado}
                rutaAprobar={`/admin/medicos/${m.usuario_id}/validar`}
                rutaRechazar={`/admin/medicos/${m.usuario_id}/rechazar`}
              />
            </Celda>
          </FilaTabla>
        ))}
      </Tabla>
    </div>
  );
}
