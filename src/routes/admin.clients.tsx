import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { MessageCircle, Phone, Search, Users } from "lucide-react";

export const Route = createFileRoute("/admin/clients")({ component: ClientsPage });

const REMINDER_MESSAGE = `Olá 👋🏽
Passou por aqui só para lembrar que pode estar na hora do seu próximo corte 😄✂️
Marque já o seu próximo atendimento connosco 🔥`;

type Client = {
  id: string;
  name: string;
  phone: string;
  last_appointment_at: string | null;
  visits: number;
};

function ClientsPage() {
  const { data: shop } = useMyShop();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "green" | "yellow" | "red">("all");

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["clients-aggregated", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const [{ data: rawClients }, { data: completed }] = await Promise.all([
        supabase.from("clients").select("*").eq("shop_id", shop!.id),
        supabase.from("appointments").select("client_id, scheduled_at").eq("shop_id", shop!.id).eq("status", "completed"),
      ]);
      const stats = new Map<string, { visits: number; last: string | null }>();
      (completed ?? []).forEach((a: any) => {
        if (!a.client_id) return;
        const cur = stats.get(a.client_id) ?? { visits: 0, last: null };
        cur.visits += 1;
        if (!cur.last || new Date(a.scheduled_at) > new Date(cur.last)) cur.last = a.scheduled_at;
        stats.set(a.client_id, cur);
      });
      return (rawClients ?? []).map((c: any) => {
        const s = stats.get(c.id);
        return {
          id: c.id, name: c.name, phone: c.phone,
          last_appointment_at: s?.last ?? c.last_appointment_at ?? null,
          visits: s?.visits ?? 0,
        };
      }).sort((a, b) => {
        const ad = a.last_appointment_at ? new Date(a.last_appointment_at).getTime() : 0;
        const bd = b.last_appointment_at ? new Date(b.last_appointment_at).getTime() : 0;
        return bd - ad;
      });
    },
  });

  const daysSince = (d?: string | null) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

  const status = (days: number | null) => {
    if (days === null) return { tone: "red" as const, label: "Sem histórico", dot: "bg-red-500" };
    if (days >= 30) return { tone: "red" as const, label: `Inativo · ${days}d`, dot: "bg-red-500" };
    if (days >= 15) return { tone: "yellow" as const, label: `${days} dias`, dot: "bg-yellow-500" };
    return { tone: "green" as const, label: `Cliente frequente`, dot: "bg-green-500" };
  };

  const waLink = (c: Client) => {
    const phone = c.phone.replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(REMINDER_MESSAGE)}`;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (clients ?? []).filter((c) => {
      if (q && !`${c.name} ${c.phone}`.toLowerCase().includes(q)) return false;
      if (filter === "all") return true;
      const days = daysSince(c.last_appointment_at);
      return status(days).tone === filter;
    });
  }, [clients, search, filter]);

  const counts = useMemo(() => {
    const c = { all: clients?.length ?? 0, green: 0, yellow: 0, red: 0 };
    (clients ?? []).forEach((cl) => { c[status(daysSince(cl.last_appointment_at)).tone]++; });
    return c;
  }, [clients]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de cortes, retenção e lembretes WhatsApp.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Procurar..." className="h-10 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Total clientes" value={counts.all} dot="bg-muted-foreground" onClick={() => setFilter("all")} active={filter === "all"} />
        <StatCard label="Frequentes" value={counts.green} dot="bg-green-500" onClick={() => setFilter("green")} active={filter === "green"} />
        <StatCard label="15+ dias" value={counts.yellow} dot="bg-yellow-500" onClick={() => setFilter("yellow")} active={filter === "yellow"} />
        <StatCard label="30+ dias" value={counts.red} dot="bg-red-500" onClick={() => setFilter("red")} active={filter === "red"} />
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Sem clientes correspondentes.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const days = daysSince(c.last_appointment_at);
            const st = status(days);
            return (
              <div key={c.id} className="card-elev group flex flex-col rounded-xl border border-border bg-card p-4 transition hover:border-foreground/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-lg font-semibold text-accent">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </a>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-medium uppercase tracking-wide`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-surface p-3 text-center">
                  <div>
                    <p className="font-display text-xl font-bold">{c.visits}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Visitas</p>
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold">{days === null ? "—" : `${days}d`}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Último corte</p>
                  </div>
                </div>

                {c.last_appointment_at && (
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    {new Date(c.last_appointment_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                )}

                <a href={waLink(c)} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] text-sm font-semibold text-white transition hover:opacity-90">
                  <MessageCircle className="h-4 w-4" /> Lembrete WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, dot, onClick, active }: { label: string; value: number; dot: string; onClick: () => void; active: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex items-center justify-between rounded-xl border bg-card p-4 text-left transition ${active ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-foreground/30"}`}>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      </div>
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
    </button>
  );
}
