import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Calendar, Smartphone, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-accent" />
            <span className="font-display text-xl font-bold">CorteJa</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Entrar</Link>
            <Link to="/signup" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
              Criar barbearia
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Para barbearias em Moçambique
        </div>
        <h1 className="text-balance text-5xl font-bold leading-tight md:text-6xl">
          Gere a sua barbearia.<br />
          <span className="text-accent">Receba reservas online.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          Página pública personalizada, agenda, serviços, barbeiros e clientes — tudo numa plataforma rápida e simples.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/signup" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Começar gratuitamente <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="inline-flex h-11 items-center rounded-md border border-border bg-card px-6 text-sm font-medium hover:bg-surface">
            Já tenho conta
          </Link>
        </div>

        <div className="gold-line mx-auto mt-16 max-w-2xl" />

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { icon: Calendar, t: "Agenda online", d: "Os seus clientes marcam 24/7 a partir da página da sua barbearia." },
            { icon: Scissors, t: "Catálogo de cortes", d: "Fotos, preços e duração — escolha visual para o cliente." },
            { icon: Smartphone, t: "Lembretes WhatsApp", d: "Reactive clientes ao fim de 7 dias com um clique." },
          ].map((f) => (
            <div key={f.t} className="card-elev rounded-xl border border-border bg-card p-6 text-left">
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CorteJa · Moçambique
      </footer>
    </div>
  );
}
