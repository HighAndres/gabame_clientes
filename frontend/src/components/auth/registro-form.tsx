"use client";

import Link from "next/link";
import { useState } from "react";

import { Aviso } from "@/components/auth/aviso";
import { ModalLegal } from "@/components/legal/modal-legal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api";
import { COOKIE_REDIRECT, COOKIE_REDIRECT_SEGUNDOS, DESTINO_POR_DEFECTO } from "@/lib/redirect";
import type { Empresa, OrigenIn, RegistroIn, SubtipoPartner, TipoCuenta, UsuarioOut } from "@/types/auth";

const TIPOS: { valor: TipoCuenta; titulo: string; detalle: string }[] = [
  { valor: "paciente", titulo: "Soy paciente o consumidor", detalle: "Acceso a marcas y tiendas del grupo." },
  {
    valor: "profesional",
    titulo: "Soy profesional de la salud",
    detalle: "Contenido tecnico Rx tras validar tu cedula profesional.",
  },
  {
    valor: "empresa",
    titulo: "Soy empresa o distribuidor",
    detalle: "Cuenta GABAME Partners, con aprobacion previa.",
  },
];

const SUBTIPOS: { valor: SubtipoPartner; texto: string }[] = [
  { valor: "distribuidor", texto: "Distribuidor" },
  { valor: "mayorista", texto: "Mayorista" },
  { valor: "institucional", texto: "Cliente institucional / licitaciones" },
];

const EMPRESAS: { valor: Empresa; texto: string }[] = [
  { valor: "gabame", texto: "GABAME" },
  { valor: "medinter", texto: "Medinter" },
  { valor: "ordan", texto: "Ordan" },
  { valor: "a7", texto: "A7" },
];

const selectClase =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function RegistroForm({
  origen,
  destino,
  enlaceLogin,
}: {
  origen: OrigenIn | null;
  destino: string;
  enlaceLogin: string;
}) {
  const [tipo, setTipo] = useState<TipoCuenta | null>(null);
  const [f, setF] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    telefono: "",
    password: "",
    confirmar: "",
    cedula: "",
    especialidad: "",
    institucion: "",
    razon_social: "",
    rfc: "",
  });
  // Empresa -> tipo de relacion. Solo las marcadas viajan al backend (ADR-0008).
  const [vinculos, setVinculos] = useState<Partial<Record<Empresa, SubtipoPartner>>>({});
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState<UsuarioOut | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) return;
    setError(null);
    if (f.password !== f.confirmar) {
      setError("Las contrasenas no coinciden.");
      return;
    }
    const datos: RegistroIn = {
      tipo_cuenta: tipo,
      email: f.email,
      password: f.password,
      nombre: f.nombre,
      apellidos: f.apellidos,
      telefono: f.telefono || null,
      origen,
      perfil_medico:
        tipo === "profesional"
          ? { cedula_profesional: f.cedula, especialidad: f.especialidad || null, institucion: f.institucion || null }
          : null,
      perfil_partner:
        tipo === "empresa"
          ? {
              razon_social: f.razon_social,
              rfc: f.rfc || null,
              vinculos: EMPRESAS.filter((e) => vinculos[e.valor]).map((e) => ({ empresa: e.valor, tipo: vinculos[e.valor]! })),
            }
          : null,
    };
    if (tipo === "empresa" && datos.perfil_partner?.vinculos.length === 0) {
      setError("Elige al menos una empresa del grupo con la que trabajas.");
      return;
    }
    setCargando(true);
    try {
      const u = await api<UsuarioOut>("/auth/registro", { method: "POST", body: JSON.stringify(datos) });
      // El destino sobrevive al paso de verificacion en una cookie corta (no en el correo).
      if (destino !== DESTINO_POR_DEFECTO) {
        document.cookie = `${COOKIE_REDIRECT}=${encodeURIComponent(destino)}; max-age=${COOKIE_REDIRECT_SEGUNDOS}; path=/; samesite=lax`;
      }
      setListo(u);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setCargando(false);
    }
  }

  if (listo) {
    return (
      <div className="space-y-4">
        <Aviso tipo="ok" titulo="Revisa tu correo">
          Enviamos un enlace de confirmacion a <strong>{listo.email}</strong>. Confirma tu correo para
          iniciar sesion.
          {listo.estado_medico === "pendiente" && (
            <> Tu acreditacion profesional quedara en revision; te avisaremos cuando este validada.</>
          )}
          {listo.estado_partner === "pendiente" && (
            <> Tu solicitud queda en revision; cada empresa te avisara por correo cuando la apruebe.</>
          )}
        </Aviso>
        <p className="text-sm text-muted-foreground">
          ¿No llego? Revisa spam o{" "}
          <Link href={enlaceLogin} className="text-primary hover:underline">
            vuelve a iniciar sesion
          </Link>{" "}
          para reenviarlo.
        </p>
      </div>
    );
  }

  if (!tipo) {
    return (
      <div className="space-y-3">
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            type="button"
            onClick={() => setTipo(t.valor)}
            className="w-full rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className="block font-medium">{t.titulo}</span>
            <span className="block text-sm text-muted-foreground">{t.detalle}</span>
          </button>
        ))}
        <p className="pt-2 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href={enlaceLogin} className="text-primary hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <button type="button" onClick={() => setTipo(null)} className="text-xs text-muted-foreground hover:underline">
        ← {TIPOS.find((t) => t.valor === tipo)?.titulo}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" required autoComplete="given-name" value={f.nombre} onChange={set("nombre")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input id="apellidos" required autoComplete="family-name" value={f.apellidos} onChange={set("apellidos")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electronico</Label>
        <Input id="email" type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefono">Telefono (opcional)</Label>
        <Input id="telefono" type="tel" autoComplete="tel" value={f.telefono} onChange={set("telefono")} />
      </div>

      {tipo === "profesional" && (
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Acreditacion profesional</legend>
          <div className="space-y-2">
            <Label htmlFor="cedula">Cedula profesional</Label>
            <Input id="cedula" required value={f.cedula} onChange={set("cedula")} />
            <p className="text-xs text-muted-foreground">
              Se usa solo para validar tu perfil. No se muestra publicamente.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="especialidad">Especialidad (opcional)</Label>
            <Input id="especialidad" value={f.especialidad} onChange={set("especialidad")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="institucion">Institucion (opcional)</Label>
            <Input id="institucion" value={f.institucion} onChange={set("institucion")} />
          </div>
        </fieldset>
      )}

      {tipo === "empresa" && (
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium">Datos de la empresa</legend>
          <div className="space-y-2">
            <Label htmlFor="razon_social">Razon social</Label>
            <Input id="razon_social" required value={f.razon_social} onChange={set("razon_social")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc">RFC (opcional)</Label>
            <Input id="rfc" value={f.rfc} onChange={set("rfc")} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Empresas del grupo con las que trabajas</legend>
            <p className="text-xs text-muted-foreground">Elige al menos una. Cada empresa revisa tu solicitud por separado.</p>
            {EMPRESAS.map((e) => {
              const marcada = Boolean(vinculos[e.valor]);
              return (
                <div key={e.valor} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
                  <label className="flex flex-1 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={marcada}
                      onChange={(ev) => {
                        const nuevo = { ...vinculos };
                        if (ev.target.checked) nuevo[e.valor] = "distribuidor";
                        else delete nuevo[e.valor];
                        setVinculos(nuevo);
                      }}
                    />
                    {e.texto}
                  </label>
                  {marcada && (
                    <select
                      aria-label={`Tipo de relacion con ${e.texto}`}
                      className={`${selectClase} w-auto`}
                      value={vinculos[e.valor]}
                      onChange={(ev) => setVinculos({ ...vinculos, [e.valor]: ev.target.value as SubtipoPartner })}
                    >
                      {SUBTIPOS.map((s) => (
                        <option key={s.valor} value={s.valor}>
                          {s.texto}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </fieldset>
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="password">Contrasena</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={f.password}
            onChange={set("password")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmar">Confirmar</Label>
          <Input
            id="confirmar"
            type="password"
            required
            autoComplete="new-password"
            value={f.confirmar}
            onChange={set("confirmar")}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Minimo 8 caracteres.</p>

      {error && <Aviso>{error}</Aviso>}

      <Button type="submit" className="w-full" disabled={cargando}>
        {cargando ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Al crear tu cuenta aceptas el <ModalLegal documento="aviso-privacidad">aviso de privacidad</ModalLegal> y los{" "}
        <ModalLegal documento="terminos">términos de uso</ModalLegal> del grupo GABAME.{" "}
        <ModalLegal documento="aviso-privacidad-simplificado">Ver resumen</ModalLegal>.
      </p>
    </form>
  );
}
