import { LoginForm } from "@/components/auth/login-form";
import { entradaPorTipo, PARAM_TIPO } from "@/lib/entradas";
import { conservarParams, leerOrigen } from "@/lib/origen";
import { destinoSeguro } from "@/lib/redirect";

type Params = Record<string, string | string[] | undefined>;

function lector(sp: Params) {
  return { get: (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null) };
}

export default function LoginPage({ searchParams }: { searchParams: Params }) {
  const params = lector(searchParams);
  // La puerta por la que llego (Area medica, Portal de clientes, Empresas) decide titulo y destino
  // cuando no viene un redirect explicito. Sin puerta, es el login generico.
  const puerta = entradaPorTipo(params.get(PARAM_TIPO));
  const destino = destinoSeguro(params.get("redirect") ?? puerta?.destino);
  const origen = leerOrigen(params);

  return (
    <section className="rounded-lg border bg-card p-7 md:p-9">
      <div className="mb-6 flex flex-col gap-1.5">
        {puerta && <p className="text-xs font-bold uppercase tracking-[0.08em] text-primary">{puerta.titulo}</p>}
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
