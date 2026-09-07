import { jwtVerify } from "jose";

import type { ClaimsSesion } from "@/types/auth";

/**
 * Verificacion local del access token (ADR-0002). Corre en el middleware (edge) y en servidor.
 *
 * El frontend solo LEE claims para decidir que renderizar; la puerta real sigue siendo el
 * backend, que valida el token en cada peticion. Comparte SECRET_KEY con el backend por .env.
 */
export async function verificarAccessToken(token: string | undefined): Promise<ClaimsSesion | null> {
  if (!token) return null;
  const secreto = process.env.JWT_SECRET;
  if (!secreto) {
    console.error("JWT_SECRET no configurado en el frontend: nadie puede iniciar sesion");
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secreto), {
      algorithms: ["HS256"],
    });
    if (payload.typ !== "access" || typeof payload.sub !== "string") return null;
    return payload as unknown as ClaimsSesion;
  } catch {
    return null;
  }
}
