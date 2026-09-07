"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { esDestinoExterno } from "@/lib/redirect";
import type { OrigenIn } from "@/types/auth";

export function LoginForm({
  destino,
  origen,
  enlaceRegistro,
  enlaceRecuperar,
}: {
  destino: string;
  origen: OrigenIn | null;
  enlaceRegistro: string;
  enlaceRecuperar: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<{ codigo: string; mensaje: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      const res = await fetch("/api/sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, origen }),
      });
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        const d = cuerpo?.detail ?? {};
        setError({ codigo: d.codigo ?? "error", mensaje: d.mensaje ?? "No se pudo iniciar sesion." });
        return;
      }
      if (esDestinoExterno(destino)) {
        window.location.assign(destino);
      } else {
        router.replace(destino);
        router.refresh();
      }
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    setAviso(null);
    try {
      await api("/auth/reenviar-verificacion", { method: "POST", body: JSON.stringify({ email }) });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    }
    setAviso("Si el correo existe y no esta confirmado, enviamos un nuevo enlace.");
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contrasena</Label>
          <Link href={enlaceRecuperar} className="text-xs text-primary hover:underline">
            Olvide mi contrasena
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <Aviso>
          {error.mensaje}
          {error.codigo === "email_no_verificado" && (
            <>
              {" "}
              <button type="button" onClick={reenviar} className="underline">
                Reenviar correo de confirmacion
              </button>
            </>
          )}
        </Aviso>
      )}
      {aviso && <Aviso tipo="info">{aviso}</Aviso>}

      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando ? "Entrando..." : "Iniciar sesion"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Aun no tienes cuenta?{" "}
        <Link href={enlaceRegistro} className="text-primary hover:underline">
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
