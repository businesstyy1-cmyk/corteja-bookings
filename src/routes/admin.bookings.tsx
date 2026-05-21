import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { MessageCircle, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings")({ component: Bookings });

function Bookings() {
  const { data: shop } = useMyShop();
  const qc = useQueryClient();

  const { data: appts } = useQuery({
    queryKey: ["appts", shop?.id],
    enabled: !!shop?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments")
        .select("*, services(name, price), barbers(name)")
        .eq("shop_id", shop!.id).order("scheduled_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const update = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["appts"] });
  };

  const waLink = (a: any) => {
    const phone = a.client_phone.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá ${a.client_name}, já passaram 7 dias desde o seu último corte na ${shop?.name}. Que tal marcar de novo? ${typeof window !== "undefined" ? window.location.origin : ""}/${shop?.slug}`);
    return `https://wa.me/${phone}?text=${msg}`;
  };

  const needsReminder = (a: any) => {
    const days = (Date.now() - new Date(a.scheduled_at).getTime()) / 86400000;
    return a.status === "completed" && days >= 7;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reservas</h1>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Serviço</th><th className="p-3 text-left">Quando</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(appts ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem reservas.</td></tr>}
            {appts?.map((a: any) => (
              <tr key={a.id}>
                <td className="p-3"><div className="font-medium">{a.client_name}</div><div className="text-xs text-muted-foreground">{a.client_phone}</div></td>
                <td className="p-3">{a.services?.name ?? "—"} <span className="text-xs text-muted-foreground">· {a.barbers?.name ?? "—"}</span></td>
                <td className="p-3">{new Date(a.scheduled_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    {needsReminder(a) && (
                      <a href={waLink(a)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-md bg-[#25D366] px-2 text-xs font-medium text-white" title="Lembrete WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5" /> Lembrar
                      </a>
                    )}
                    {a.status === "pending" && <button onClick={() => update(a.id, "confirmed")} className="rounded-md border border-border p-1.5 hover:bg-surface" title="Confirmar"><Check className="h-3.5 w-3.5" /></button>}
                    {a.status !== "completed" && a.status !== "cancelled" && <button onClick={() => update(a.id, "completed")} className="rounded-md border border-border bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Concluir</button>}
                    {a.status !== "cancelled" && <button onClick={() => update(a.id, "cancelled")} className="rounded-md border border-border p-1.5 hover:bg-surface" title="Cancelar"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-900",
    confirmed: "bg-blue-100 text-blue-900",
    completed: "bg-green-100 text-green-900",
    cancelled: "bg-red-100 text-red-900",
  };
  const label: Record<string, string> = { pending: "Pendente", confirmed: "Confirmada", completed: "Concluída", cancelled: "Cancelada" };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? ""}`}>{label[status] ?? status}</span>;
}
