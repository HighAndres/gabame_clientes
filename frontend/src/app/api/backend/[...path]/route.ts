import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_ACCESS } from "@/lib/cookies";
import { cabecerasDeSalida } from "@/lib/proxy-cabeceras";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Proxy generico: /api/backend/<ruta> -> backend /api/v1/<ruta> con el access token de la cookie.
 * Reenvia el cuerpo tal cual (JSON o multipart) y devuelve la respuesta tal cual (JSON o archivo).
 * Los componentes cliente nunca ven el token. El backend sigue decidiendo permisos.
 */
async function reenviar(req: NextRequest, path: string[]) {
  const token = cookies().get(COOKIE_ACCESS)?.value;
  if (!token) {
    return NextResponse.json({ detail: { codigo: "no_autenticado", mensaje: "Sin sesión" } }, { status: 401 });
  }

  const url = `${BASE}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const conCuerpo = req.method !== "GET" && req.method !== "HEAD";
  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method,
      headers,
      body: conCuerpo ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { detail: { codigo: "sin_conexion", mensaje: "No se pudo contactar al servidor." } },
      { status: 502 },
    );
  }

  return new NextResponse(res.status === 204 ? null : res.body, {
    status: res.status,
    headers: cabecerasDeSalida(res.headers),
  });
}

type Ctx = { params: { path: string[] } };

// Todos los metodos que el portal usa contra el backend. Falta uno y la funcion que lo use
// responde 405 sin explicacion: asi estuvieron rotos guardar roles y guardar requisitos.
export const GET = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const POST = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const PUT = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const PATCH = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const DELETE = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
