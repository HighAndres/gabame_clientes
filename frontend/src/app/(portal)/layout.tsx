import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/marca/logo";
import { CerrarSesion } from "@/components/portal/cerrar-sesion";
import { NavLink } from "@/components/portal/nav-link";
import { AvatarIniciales } from "@/components/ui/avatar-iniciales";
import { navPara } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

/**
 * Shell ligero del portal (paciente, medico, partner): barra superior con logo del grupo,
 * navegacion tipo pildora y usuario. El area admin tiene su propio shell en (admin).
 * El middleware ya exigio sesion; aqui se vuelve a leer en servidor (guarda de layout).
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const usuario = await leerUsuarioActual();
  if (!usuario) redirect("/login");
  const t = await getTranslations("comun");
  const items = navPara(usuario);

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        {t("saltarAlContenido")}
      </a>
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo href="/dashboard" width={116} />
            <nav className="hidden gap-1 md:flex" aria-label={t("navegacionPrincipal")}>
              {items.map((n) => (
                <NavLink key={n.href} href={n.href} exacto={n.href === "/dashboard"}>
                  {n.texto}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden items-center gap-2.5 sm:flex">
              <AvatarIniciales nombre={usuario.nombre} apellidos={usuario.apellidos} />
              <span className="text-heading">
                {usuario.nombre} {usuario.apellidos}
              </span>
            </span>
            <CerrarSesion />
            <details className="relative md:hidden">
              <summary
                className="inline-flex h-9 cursor-pointer list-none items-center rounded-md border px-3 text-sm font-bold"
                aria-label={t("abrirMenu")}
              >
                {t("menu")}
              </summary>
              <nav
                className="absolute right-0 z-40 mt-2 flex w-56 flex-col gap-1 rounded-lg border bg-card p-2 shadow-sm"
                aria-label={t("navegacionPrincipal")}
              >
                {items.map((n) => (
                  <NavLink key={n.href} href={n.href} exacto={n.href === "/dashboard"}>
                    {n.texto}
                  </NavLink>
                ))}
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="contenido" className="container py-10">
        {children}
      </main>
    </div>
  );
}
