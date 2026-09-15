"use client";

import Link from "next/link";
import { useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";

export function RestablecerForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  if (!token) {
    return (
      <Aviso>
        El enlace esta incompleto.{" "}
        <Link href="/recuperar" className="underline">
          Solicita uno nuevo
        </Link>
        .
      </Aviso>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmar) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    setCargando(true);
    try {
      await api("/auth/restablecer", { method: "POST", body: JSON.stringify({ token, password }) });
      setListo(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo restablecer la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <Aviso tipo="ok" titulo="Contraseña actualizada">
          Tus sesiones anteriores se cerraron. Inicia sesión con la nueva contraseña.
        </Aviso>
        <Button asChild className="w-full">
          <Link href="/login">Iniciar sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmar">Confirmar contraseña</Label>
        <Input
          id="confirmar"
          type="password"
          required
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">Minimo 8 caracteres.</p>
      {error && <Aviso>{error}</Aviso>}
      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando ? "Guardando..." : "Guardar contraseña"}
      </Button>
    </form>
  );
}
