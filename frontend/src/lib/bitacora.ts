import { NOMBRE_EMPRESA, NOMBRE_ROL } from "@/lib/matriz-roles";
import type { BitacoraOut } from "@/types/admin";
import type { Empresa, Rol } from "@/types/auth";

const ESTADO = { validado: "aprobado", rechazado: "rechazado", pendiente: "pendiente" } as const;
const CAMPO_ACREDITACION: Record<string, string> = {
  cedula_profesional: "cédula",
  especialidad: "especialidad",
  institucion: "institución",
};

function rolTexto(r: { rol: Rol; empresa: Empresa | null }): string {
  return `${NOMBRE_ROL[r.rol]}${r.empresa ? ` de ${NOMBRE_EMPRESA[r.empresa]}` : ""}`;
}

/** Texto legible de una entrada de bitacora. Nunca incluye cedulas ni datos sensibles: el backend no los guarda. */
export function describirAccion(b: BitacoraOut): string {
  const d = b.detalle as Record<string, unknown>;
  const motivo = typeof d.motivo === "string" && d.motivo ? ` Motivo: ${d.motivo}.` : "";
  switch (b.accion) {
    case "medico_validado":
      return "Validó la acreditación profesional.";
    case "medico_rechazado":
      return `Rechazó la acreditación profesional.${motivo}`;
    case "vinculo_validado":
    case "vinculo_rechazado": {
      const empresa = d.empresa as Empresa | undefined;
      const a = (d.a as keyof typeof ESTADO) ?? "pendiente";
      return `Vínculo con ${empresa ? NOMBRE_EMPRESA[empresa] : "la empresa"}: ${ESTADO[a] ?? a}.${motivo}`;
    }
    case "documento_validado":
      return `Aceptó el documento "${String(d.tipo ?? "")}".`;
    case "documento_rechazado":
      return `Rechazó el documento "${String(d.tipo ?? "")}".${motivo}`;
    case "usuario_creado": {
      const roles = (d.roles as { rol: Rol; empresa: Empresa | null }[] | undefined) ?? [];
      return `Creó la cuenta administrativa (${roles.map(rolTexto).join(", ")}).`;
    }
    case "roles_actualizados": {
      const ag = ((d.agregados as { rol: Rol; empresa: Empresa | null }[] | undefined) ?? []).map(rolTexto);
      const re = ((d.retirados as { rol: Rol; empresa: Empresa | null }[] | undefined) ?? []).map(rolTexto);
      const partes = [];
      if (ag.length) partes.push(`asignó ${ag.join(", ")}`);
      if (re.length) partes.push(`retiró ${re.join(", ")}`);
      return `Roles: ${partes.join("; ")}.`;
    }
    case "usuario_desactivado":
      return "Desactivó la cuenta.";
    case "usuario_activado":
      return "Reactivó la cuenta.";
    case "restablecimiento_enviado":
      return "Envió un enlace para restablecer la contraseña.";
    case "acreditacion_actualizada": {
      // Que campos, nunca su valor: el backend no guarda la cedula en la bitacora.
      const campos = ((d.campos as string[] | undefined) ?? []).map((c) => CAMPO_ACREDITACION[c] ?? c);
      return `Actualizó su acreditación${campos.length ? ` (${campos.join(", ")})` : ""}.`;
    }
    case "acreditacion_reenviada":
      return "Corrigió su acreditación y la volvió a enviar a revisión.";
    default:
      return b.accion.replace(/_/g, " ");
  }
}
