import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { urlBackend } from "@/lib/backend-url";
import { COOKIE_ACCESS } from "@/lib/cookies";
import { metodoEfectivo } from "@/lib/metodo";
import { cabecerasDeSalida, rutaBackend } from "@/lib/proxy-cabeceras";

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

  const ruta = rutaBackend(path);
  if (ruta === null) {
    return NextResponse.json({ detail: { codigo: "ruta_invalida", mensaje: "Ruta inválida" } }, { status: 400 });
  }

  const url = `${urlBackend()}/api/v1/${ruta}${req.nextUrl.search}`;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  // El navegador manda PUT/PATCH/DELETE como POST con cabecera (lib/metodo.ts); aqui se restituye.
  const metodo = metodoEfectivo(req);
  const conCuerpo = metodo !== "GET" && metodo !== "HEAD";
  let res: Response;
  try {
    res = await fetch(url, {
      method: metodo,
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
// PUT/PATCH/DELETE directos siguen aceptandose (local y pruebas), pero en el portal llegan por POST.
export const GET = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const POST = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const PUT = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const PATCH = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
export const DELETE = (req: NextRequest, ctx: Ctx) => reenviar(req, ctx.params.path);
