import "server-only";

import { cookies } from "next/headers";

import { api } from "@/lib/api";
import { COOKIE_ACCESS } from "@/lib/cookies";
import { verificarAccessToken } from "@/lib/jwt";
import type { ClaimsSesion, UsuarioOut } from "@/types/auth";

export { COOKIE_ACCESS, COOKIE_REFRESH, borrarSesion, guardarSesion } from "@/lib/cookies";

/** Claims del access token de la peticion actual (server components / route handlers). */
export async function leerSesion(): Promise<ClaimsSesion | null> {
  return verificarAccessToken(cookies().get(COOKIE_ACCESS)?.value);
}

/** Llama al backend con el access token de la cookie. */
export async function apiConSesion<T>(path: string, init?: RequestInit): Promise<T> {
  const token = cookies().get(COOKIE_ACCESS)?.value;
  return api<T>(path, { ...init, token });
}

/** Usuario completo desde el backend; null si no hay sesion valida. */
export async function leerUsuarioActual(): Promise<UsuarioOut | null> {
  const claims = await leerSesion();
  if (!claims) return null;
  try {
    return await apiConSesion<UsuarioOut>("/usuarios/me");
  } catch {
    return null;
  }
}
