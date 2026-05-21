import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { MessageCircle } from "lucide-react";

export const Route = createFileRoute("/admin/clients")({ component: ClientsPage });

function ClientsPage() {
  const { data: shop } = useMyShop();
  const { data: clients } = useQuery({
    queryKey: ["clients", shop?.id], enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("clients").select("*").eq("shop_id", shop!.id).order("last_appointment_at", { ascending: false, nullsFirst: false })).data ?? [],
  });

  const waLink = (c: any) => {
    const phone = c.phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${c.name}, sentimos a sua falta na ${shop?.name}! Reserve o seu corte: ${typeof window !== "undefined" ? window.location.origin : ""}/${shop?.slug}`);
    return `https://wa.me/${phone}?text=${msg}`;
  };
  const daysSince = (d?: string) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Clientes</h1>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Telefone</th><th className="p-3 text-left">Último corte</th><th className="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(clients ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Sem clientes ainda.</td></tr>}
            {clients?.map((c) => {
              const days = daysSince(c.last_appointment_at);
              const needsReminder = days !== null && days >= 7;
              return (
                <tr key={c.id}>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.phone}</td>
                  <td className="p-3">{days === null ? "—" : `há ${days} dias`}</td>
                  <td className="p-3 text-right">
                    {needsReminder && (
                      <a href={waLink(c)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md bg-[#25D366] px-2 text-xs font-medium text-white">
                        <MessageCircle className="h-3.5 w-3.5" /> Lembrete
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
