import { redirect } from "next/navigation";

import { type MotivoAviso, PARAM_AVISO } from "@/lib/avisos-acceso";
import { type Alcance, alcanceDe } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";
import type { UsuarioOut } from "@/types/auth";

/**
 * Guarda de layout para secciones del panel admin: si el alcance del usuario no cubre la seccion,
 * vuelve al resumen con el motivo (ADR-0011) en vez de reventar con el 403 del backend. Ocultar no
 * es permiso: el backend rechaza igual; esto solo evita una pantalla de error a quien teclea la URL.
 */
export async function exigirAlcance(condicion: (a: Alcance) => boolean, motivo: MotivoAviso): Promise<UsuarioOut> {
  const u = await leerUsuarioActual();
  if (!u) redirect("/login");
  if (!condicion(alcanceDe(u))) redirect(`/admin?${PARAM_AVISO}=${motivo}`);
  return u;
}
