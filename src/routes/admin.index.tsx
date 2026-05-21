import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { CalendarDays, Scissors, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data: shop } = useMyShop();

  const { data: stats } = useQuery({
    queryKey: ["stats", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const start = new Date(); start.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const [{ count: today }, { count: clients }, { data: revenue }, { data: upcoming }] = await Promise.all([
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("shop_id", shop!.id).gte("scheduled_at", start.toISOString()).lt("scheduled_at", new Date(start.getTime()+86400000).toISOString()),
        supabase.from("clients").select("*", { count: "exact", head: true }).eq("shop_id", shop!.id),
        supabase.from("appointments").select("price").eq("shop_id", shop!.id).eq("status", "completed").gte("scheduled_at", monthStart.toISOString()),
        supabase.from("appointments").select("*, services(name), barbers(name)").eq("shop_id", shop!.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5),
      ]);
      const rev = (revenue ?? []).reduce((s, r) => s + Number(r.price ?? 0), 0);
      return { today: today ?? 0, clients: clients ?? 0, revenue: rev, upcoming: upcoming ?? [] };
    },
  });

  if (!shop) return <p className="text-sm text-muted-foreground">A carregar barbearia...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {shop.name}</h1>
        <p className="text-sm text-muted-foreground">Resumo da sua barbearia.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={CalendarDays} label="Reservas hoje" value={stats?.today ?? 0} />
        <Stat icon={Users} label="Clientes" value={stats?.clients ?? 0} />
        <Stat icon={TrendingUp} label="Receita do mês" value={`${(stats?.revenue ?? 0).toLocaleString("pt-MZ")} MZN`} />
        <Stat icon={Scissors} label="Estado" value={shop.status === "active" ? "Ativa" : shop.status} />
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Próximas reservas</h2>
        <div className="mt-4 divide-y divide-border">
          {(stats?.upcoming ?? []).length === 0 && <p className="py-6 text-sm text-muted-foreground">Sem reservas próximas.</p>}
          {stats?.upcoming.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{a.client_name}</p>
                <p className="text-xs text-muted-foreground">{a.services?.name ?? "Serviço"} · {a.barbers?.name ?? "—"}</p>
              </div>
              <div className="text-right text-sm">
                <p>{new Date(a.scheduled_at).toLocaleDateString("pt-PT")}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.scheduled_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </div>
  );
}
