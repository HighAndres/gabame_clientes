import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ApiError, api } from "@/lib/api";
import { leerOrigen } from "@/lib/origen";
import { COOKIE_REFRESH, borrarSesion, guardarSesion } from "@/lib/sesion";
import type { OrigenIn, TokenOut } from "@/types/auth";

/**
 * POST /api/sesion  — login: pide tokens al backend y los guarda en cookies httpOnly.
 * DELETE /api/sesion — logout: revoca el refresh en el backend y borra las cookies.
 *
 * Es el unico lugar del frontend que ve un token en claro.
 */
export async function POST(req: Request) {
  let cuerpo: { email?: string; password?: string; origen?: OrigenIn | null };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ detail: { codigo: "datos_invalidos", mensaje: "Cuerpo inválido" } }, { status: 400 });
  }

  // El origen se re-valida aqui: el navegador no decide que se guarda.
  const origen = cuerpo.origen
    ? leerOrigen({
        get: (k) =>
          k === "origen" ? cuerpo.origen!.producto : k === "ruta" ? cuerpo.origen!.ruta_entrada : cuerpo.origen!.campana,
      })
    : null;

  try {
    const tokens = await api<TokenOut>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: cuerpo.email, password: cuerpo.password, origen }),
    });
    const res = NextResponse.json({ ok: true });
    guardarSesion(res, tokens);
    return res;
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ detail: { codigo: e.codigo, mensaje: e.message } }, { status: e.status || 502 });
    }
    throw e;
  }
}

export async function DELETE() {
  const refresh = cookies().get(COOKIE_REFRESH)?.value;
  if (refresh) {
    try {
      await api<void>("/auth/logout", { method: "POST", body: JSON.stringify({ refresh_token: refresh }) });
    } catch {
      // El logout local procede aunque el backend no responda: las cookies se borran igual.
    }
  }
  const res = new NextResponse(null, { status: 204 });
  borrarSesion(res);
  return res;
}
