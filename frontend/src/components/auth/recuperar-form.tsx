"use client";

import Link from "next/link";
import { useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";

export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api("/auth/recuperar", { method: "POST", body: JSON.stringify({ email }) });
      setEnviado(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud.");
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <div className="space-y-4">
        <Aviso tipo="ok" titulo="Revisa tu correo">
          Si <strong>{email}</strong> tiene una Cuenta GABAME, enviamos un enlace para restablecer la
          contrasena. Vence en 60 minutos.
        </Aviso>
        <Link href="/login" className="text-sm text-primary hover:underline">
          Volver a iniciar sesion
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <Aviso>{error}</Aviso>}
      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando ? "Enviando..." : "Enviar enlace"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Volver a iniciar sesion
        </Link>
      </p>
    </form>
  );
}
