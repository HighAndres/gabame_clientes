import Link from "next/link";

export default function Home() {
  return (
    <main className="container flex min-h-screen flex-col justify-center gap-6 py-20">
      <p className="text-sm font-medium uppercase tracking-widest text-gabame">Cuenta GABAME</p>
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
        Portal de clientes y profesionales de la salud.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        GABAME · Medinter · Ordan · A7 Pharmaceutical Distributor
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-gabame px-5 py-2.5 text-sm font-medium text-gabame-fg"
        >
          Iniciar sesion
        </Link>
        <Link href="/registro" className="rounded-md border px-5 py-2.5 text-sm font-medium">
          Crear cuenta
        </Link>
      </div>
    </main>
  );
}
