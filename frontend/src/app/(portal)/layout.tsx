import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CerrarSesion } from "@/components/portal/cerrar-sesion";
import { NavLink } from "@/components/portal/nav-link";
import { navPara } from "@/lib/matriz-roles";
import { leerUsuarioActual } from "@/lib/sesion";

/**
 * Shell del portal. El middleware ya exigio sesion; aqui se vuelve a leer en servidor
 * (guarda de layout) y la navegacion sale de la matriz provisional (ADR-0004, pendiente 0.2).
 *
 * Accesibilidad (WCAG 2.1 AA): enlace para saltar al contenido, landmarks <header>/<nav>/<main>,
 * `aria-current` en el enlace activo y menu movil sin JavaScript (details/summary).
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        {t("saltarAlContenido")}
      </a>
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              {t("nombrePortal")}
            </Link>
            <nav className="hidden gap-4 text-sm md:flex" aria-label={t("navegacionPrincipal")}>
              {items.map((n) => (
                <NavLink key={n.href} href={n.href} exacto={n.href === "/dashboard"}>
                  {n.texto}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {usuario.nombre} {usuario.apellidos}
            </span>
            <CerrarSesion />
            <details className="relative md:hidden">
              <summary className="cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm" aria-label={t("abrirMenu")}>
                {t("menu")}
              </summary>
              <nav
                className="absolute right-0 z-40 mt-2 flex w-56 flex-col gap-1 rounded-md border bg-background p-2 text-sm shadow"
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
