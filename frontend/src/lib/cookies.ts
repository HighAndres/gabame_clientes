import type { NextResponse } from "next/server";

import type { TokenOut } from "@/types/auth";

/**
 * Cookies de sesion (ADR-0002). Edge-safe: lo usan el middleware y los route handlers.
 * El backend emite access + refresh; Next los guarda httpOnly. Ningun token toca el JS del navegador.
 */
export const COOKIE_ACCESS = "gabame_session";
export const COOKIE_REFRESH = "gabame_refresh";

const REFRESH_DIAS = 14;

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function guardarSesion(res: NextResponse, tokens: TokenOut): void {
  res.cookies.set(COOKIE_ACCESS, tokens.access_token, { ...baseCookie, maxAge: tokens.expires_in });
  res.cookies.set(COOKIE_REFRESH, tokens.refresh_token, {
    ...baseCookie,
    maxAge: REFRESH_DIAS * 24 * 60 * 60,
  });
}

export function borrarSesion(res: NextResponse): void {
  res.cookies.set(COOKIE_ACCESS, "", { ...baseCookie, maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { ...baseCookie, maxAge: 0 });
}
