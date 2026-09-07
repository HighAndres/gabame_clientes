import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { apiConSesion } from "@/lib/sesion";
import type { UsuarioOut } from "@/types/auth";

/** PATCH /api/perfil — reenvia al backend con el access token de la cookie httpOnly. */
export async function PATCH(req: Request) {
  const cuerpo = await req.text();
  try {
    const usuario = await apiConSesion<UsuarioOut>("/usuarios/me", { method: "PATCH", body: cuerpo });
    return NextResponse.json(usuario);
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ detail: { codigo: e.codigo, mensaje: e.message } }, { status: e.status || 502 });
    }
    throw e;
  }
}
