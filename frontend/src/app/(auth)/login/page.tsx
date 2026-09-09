import { LoginForm } from "@/components/auth/login-form";
import { conservarParams, leerOrigen } from "@/lib/origen";
import { destinoSeguro } from "@/lib/redirect";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

export default function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = lector(searchParams);
  const destino = destinoSeguro(params.get("redirect"));
  const origen = leerOrigen(params);

  return (
    <section className="rounded-lg border bg-card p-7 md:p-9">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-[26px] font-bold">Iniciar sesion</h1>
        <p className="text-sm text-muted-foreground">Entra con tu correo y contrasena.</p>
      </div>
      <LoginForm
        destino={destino}
        origen={origen}
        enlaceRegistro={`/registro${conservarParams(params)}`}
        enlaceRecuperar="/recuperar"
      />
    </section>
  );
}
