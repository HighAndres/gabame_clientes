import { NextResponse, type NextRequest } from "next/server";

import { type MotivoAviso, PARAM_AVISO } from "@/lib/avisos-acceso";
import { COOKIE_ACCESS, COOKIE_REFRESH, borrarSesion, guardarSesion } from "@/lib/cookies";
import { verificarAccessToken } from "@/lib/jwt";
import { destinoSeguro } from "@/lib/redirect";
import type { ClaimsSesion, Rol, TokenOut } from "@/types/auth";

/**
 * Puerta de sesion y rol del portal.
 *
 * - Verifica la firma del access token localmente (jose). Si expiro y hay refresh, lo rota
 *   contra el backend y reescribe las cookies en la misma respuesta.
 * - Aplica puertas por prefijo segun los claims `roles`. Ocultar una ruta NO es un permiso:
 *   el backend rechaza igual; esto solo evita renderizar pantallas que no aplican.
 * - Un usuario ya autenticado que entra a /login o /registro va a su destino seguro.
 */
/** Prefijo protegido, motivo del aviso si no pasa, y roles que sí pasan. */
const PUERTAS: readonly (readonly [string, MotivoAviso, readonly Rol[]])[] = [
  ["/medico", "solo_medicos", ["medico"]],
  ["/partner", "solo_partners", ["partner"]],
  ["/admin", "solo_panel", ["admin_empresa", "editor_empresa", "admin_grupo"]],
];
const RUTAS_AUTH = ["/login", "/registro"];

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function coincide(pathname: string, prefijo: string): boolean {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`);
}

async function refrescar(refresh: string): Promise<TokenOut | null> {
  try {
    const res = await fetch(`${API}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TokenOut;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let claims: ClaimsSesion | null = await verificarAccessToken(request.cookies.get(COOKIE_ACCESS)?.value);
  let tokensNuevos: TokenOut | null = null;
  if (!claims) {
    const refresh = request.cookies.get(COOKIE_REFRESH)?.value;
    if (refresh) {
      tokensNuevos = await refrescar(refresh);
      if (tokensNuevos) claims = await verificarAccessToken(tokensNuevos.access_token);
    }
  }

  // Pantallas de auth: con sesion valida no tienen sentido
  if (RUTAS_AUTH.some((p) => coincide(pathname, p))) {
    if (!claims) return NextResponse.next();
    const destino = destinoSeguro(request.nextUrl.searchParams.get("redirect"));
    const res = NextResponse.redirect(new URL(destino, request.url));
    if (tokensNuevos) guardarSesion(res, tokensNuevos);
    return res;
  }

  // Portal: exige sesion
  if (!claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", `${pathname}${search}`);
    const res = NextResponse.redirect(url);
    borrarSesion(res);
    return res;
  }

  // Puertas por rol: se devuelve al inicio con el motivo, no en silencio (ADR-0011)
  const puerta = PUERTAS.find(([prefijo]) => coincide(pathname, prefijo));
  if (puerta && !puerta[2].some((rol) => claims!.roles.includes(rol))) {
    const destino = new URL("/dashboard", request.url);
    destino.searchParams.set(PARAM_AVISO, puerta[1]);
    const res = NextResponse.redirect(destino);
    if (tokensNuevos) guardarSesion(res, tokensNuevos);
    return res;
  }

  const res = NextResponse.next();
  if (tokensNuevos) guardarSesion(res, tokensNuevos);
  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/perfil/:path*",
    "/medico/:path*",
    "/partner/:path*",
    "/espacios/:path*",
    "/admin/:path*",
    "/login",
    "/registro",
  ],
};
