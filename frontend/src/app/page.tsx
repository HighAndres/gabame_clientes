import { Briefcase, Stethoscope, User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/marca/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERFILES = [
  { icono: User, titulo: "Paciente o consumidor", detalle: "Marcas del grupo y farmacia en linea." },
  { icono: Stethoscope, titulo: "Profesional de la salud", detalle: "Informacion tecnica del portafolio, con cedula validada." },
  { icono: Briefcase, titulo: "Empresa o distribuidor", detalle: "Documentos, contactos comerciales y portales operativos." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b">
        <div className="container flex h-[72px] items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-3" aria-label="Acceso">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Iniciar sesion
            </Link>
            <Link href="/registro" className={cn(buttonVariants())}>
              Crear cuenta
            </Link>
          </nav>
        </div>
      </header>

      <main id="contenido" className="container grid flex-1 items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Cuenta GABAME</p>
          <h1 className="max-w-xl text-4xl font-bold leading-[1.08] md:text-5xl">
            Portal de clientes y profesionales de la salud
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Verifica tu correo, completa tu perfil y entra a las marcas, tiendas y contenido que te corresponden.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/registro" className={cn(buttonVariants({ size: "lg" }))}>
              Crear cuenta
            </Link>
            <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
              Iniciar sesion
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl bg-background p-6 md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            ¿Como te relacionas con GABAME?
          </p>
          <ul className="flex flex-col gap-3">
            {PERFILES.map((p) => (
              <li key={p.titulo} className="flex items-center gap-4 rounded-lg border bg-white px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <p.icono className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-bold text-foreground">{p.titulo}</span>
                  <span className="text-[13px] text-muted-foreground">{p.detalle}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="container flex flex-wrap items-center justify-between gap-3 border-t py-8 text-[13px] text-muted-foreground">
        <span>GABAME · Medinter · Ordan · A7 Pharmaceutical Distributor</span>
        <span className="flex gap-6">
          <a href="https://gabame.com" className="text-primary hover:text-primary-hover">
            Aviso de privacidad
          </a>
          <a href="https://gabame.com" className="text-primary hover:text-primary-hover">
            Contacto
          </a>
        </span>
      </footer>
    </div>
  );
}
