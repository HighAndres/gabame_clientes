"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { enviar, mensajeDeError } from "@/lib/peticion";

export function CerrarSesion() {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function salir() {
    setCargando(true);
    try {
      await enviar("/api/sesion", { method: "DELETE" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={salir} disabled={cargando}>
      Cerrar sesión
    </Button>
  );
}
