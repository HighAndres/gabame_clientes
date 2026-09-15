"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { COOKIE_REDIRECT, DESTINO_POR_DEFECTO, destinoSeguro } from "@/lib/redirect";

function leerYBorrarCookieRedirect(): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_REDIRECT}=([^;]*)`));
  if (!m) return DESTINO_POR_DEFECTO;
  document.cookie = `${COOKIE_REDIRECT}=; max-age=0; path=/; samesite=lax`;
  return destinoSeguro(decodeURIComponent(m[1]));
}

export function VerificarEmail({ token }: { token: string | null }) {
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">(token ? "cargando" : "error");
  const [mensaje, setMensaje] = useState<string>(token ? "" : "El enlace esta incompleto.");
  const [destino, setDestino] = useState(DESTINO_POR_DEFECTO);
  // El token es de un solo uso: la peticion se manda exactamente una vez por token,
  // aunque React (StrictMode en dev) vuelva a ejecutar el efecto.
  const enviadoPara = useRef<string | null>(null);

  useEffect(() => {
    if (!token || enviadoPara.current === token) return;
    enviadoPara.current = token;
    api<{ mensaje: string }>("/auth/verificar-email", { method: "POST", body: JSON.stringify({ token }) })
      .then((r) => {
        setMensaje(r.mensaje);
        setDestino(leerYBorrarCookieRedirect());
        setEstado("ok");
      })
      .catch((e) => {
        setMensaje(e instanceof ApiError ? e.message : "No se pudo confirmar el correo.");
        setEstado("error");
      });
  }, [token]);

  if (estado === "cargando") return <p className="text-sm text-muted-foreground">Confirmando tu correo...</p>;

  if (estado === "error") {
    return (
      <div className="space-y-4">
        <Aviso>{mensaje}</Aviso>
        <p className="text-sm text-muted-foreground">
          Si el enlace expiro,{" "}
          <Link href="/login" className="text-primary hover:underline">
            inicia sesión
          </Link>{" "}
          para pedir uno nuevo.
        </p>
      </div>
    );
  }

  const enlaceLogin = destino === DESTINO_POR_DEFECTO ? "/login" : `/login?redirect=${encodeURIComponent(destino)}`;
  return (
    <div className="space-y-4">
      <Aviso tipo="ok" titulo="Correo confirmado">
        {mensaje}
      </Aviso>
      <Button asChild className="w-full">
        <Link href={enlaceLogin}>Iniciar sesión</Link>
      </Button>
    </div>
  );
}
