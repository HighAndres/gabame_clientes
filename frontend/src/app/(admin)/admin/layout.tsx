import { Briefcase, Building2, FileText, LayoutGrid, type LucideIcon, Newspaper, ScrollText, Stethoscope, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/marca/logo";
import { CerrarSesion } from "@/components/portal/cerrar-sesion";
import { NavLink } from "@/components/portal/nav-link";
import { AvatarIniciales } from "@/components/ui/avatar-iniciales";
import { alcanceDe, navAdmin, NOMBRE_EMPRESA, rolAdminDe } from "@/lib/matriz-roles";
import { apiConSesion, leerUsuarioActual } from "@/lib/sesion";
import type { ResumenAdmin } from "@/types/admin";

const ICONO: Record<string, LucideIcon> = {
  "/admin": LayoutGrid,
  "/admin/medicos": Stethoscope,
  "/admin/contenido": FileText,
  "/admin/publicaciones": Newspaper,
  "/admin/partners": Briefcase,
  "/admin/usuarios": Users,
  "/admin/espacios": Building2,
  "/admin/bitacora": ScrollText,
};

/**
 * Shell admin (lienzo aprobado): barra lateral con el espacio de la empresa, navegacion por
 * modulo y contadores. Guarda de layout: solo admins y editores; lo que cada uno ve lo decide
 * `navAdmin` (espejo del alcance del backend).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await leerUsuarioActual();
  if (!u) redirect("/login");
  const alcance = alcanceDe(u);
  if (!alcance.esAdmin) redirect("/dashboard");
  const t = await getTranslations("comun");

  let resumen: ResumenAdmin | null = null;
  try {
    resumen = await apiConSesion<ResumenAdmin>("/admin/resumen");
  } catch {
    resumen = null;
  }
  const pendientes: Record<string, number | null | undefined> = {
    "/admin/partners": resumen?.partners_pendientes,
    "/admin/medicos": resumen?.medicos_pendientes,
  };
  const espacio = alcance.grupo ? "Todo el grupo" : alcance.empresas.map((e) => NOMBRE_EMPRESA[e]).join(", ");
  const rol = rolAdminDe(u);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        {t("saltarAlContenido")}
      </a>

      <aside className="flex flex-col gap-6 border-b bg-card px-4 py-5 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-2">
          <Logo href="/dashboard" width={112} />
          <span className="lg:hidden">
            <CerrarSesion />
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="px-2 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Espacio</p>
          <div className="flex h-10 items-center rounded-md border bg-card px-3 text-sm font-bold">{espacio}</div>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Administración">
          {navAdmin(u).map((n) => {
            const Icono = ICONO[n.href] ?? LayoutGrid;
            const cuenta = pendientes[n.href];
            return (
              <NavLink key={n.href} href={n.href} exacto={n.href === "/admin"} className="h-10 justify-between">
                <span className="flex items-center gap-2.5">
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  {n.texto}
                </span>
                {typeof cuenta === "number" && cuenta > 0 && (
                  <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-warning px-1.5 text-xs font-bold text-white">
                    {cuenta}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto hidden items-center justify-between gap-2 border-t pt-4 lg:flex">
          <span className="flex items-center gap-2.5">
            <AvatarIniciales nombre={u.nombre} apellidos={u.apellidos} />
            <span className="flex flex-col">
              <span className="text-[13px] font-bold">
                {u.nombre} {u.apellidos}
              </span>
              <span className="text-xs text-muted-foreground">{rol}</span>
            </span>
          </span>
          <CerrarSesion />
        </div>
      </aside>

      <main id="contenido" className="px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
