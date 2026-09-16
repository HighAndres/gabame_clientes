import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api";
import { metodoEfectivo } from "@/lib/metodo";
import { apiConSesion } from "@/lib/sesion";
import type { UsuarioOut } from "@/types/auth";

/**
 * PATCH /api/perfil — reenvia al backend con el access token de la cookie httpOnly.
 * En el portal llega como POST con `x-metodo: PATCH` (lib/metodo.ts).
 */
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

export async function POST(req: Request) {
  if (metodoEfectivo(req) !== "PATCH") {
    return NextResponse.json({ detail: { codigo: "metodo_no_permitido", mensaje: "Método no permitido" } }, { status: 405 });
  }
  return PATCH(req);
}
