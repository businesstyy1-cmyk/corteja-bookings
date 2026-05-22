import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { Check, X } from "lucide-react";
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
        .eq("shop_id", shop!.id)
        .neq("status", "completed")
        .order("scheduled_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const update = async (a: any, status: "pending" | "confirmed" | "completed" | "cancelled") => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", a.id);
    if (error) return toast.error(error.message);
    if (status === "completed" && a.client_id) {
      await supabase.from("clients").update({ last_appointment_at: a.scheduled_at }).eq("id", a.client_id);
      toast.success("Concluído. Cliente movido para a aba Clientes.");
    } else {
      toast.success("Atualizado");
    }
    qc.invalidateQueries({ queryKey: ["appts"] });
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reservas</h1>
        <p className="text-sm text-muted-foreground mt-1">Reservas ativas. Após concluir, o cliente é movido para a aba <strong>Clientes</strong>.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Serviço</th><th className="p-3 text-left">Quando</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(appts ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem reservas ativas.</td></tr>}
            {appts?.map((a: any) => (
              <tr key={a.id}>
                <td className="p-3"><div className="font-medium">{a.client_name}</div><div className="text-xs text-muted-foreground">{a.client_phone}</div></td>
                <td className="p-3">{a.services?.name ?? "—"} <span className="text-xs text-muted-foreground">· {a.barbers?.name ?? "—"}</span></td>
                <td className="p-3">{new Date(a.scheduled_at).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    {a.status === "pending" && <button onClick={() => update(a, "confirmed")} className="rounded-md border border-border p-1.5 hover:bg-surface" title="Confirmar"><Check className="h-3.5 w-3.5" /></button>}
                    <button onClick={() => update(a, "completed")} className="rounded-md border border-border bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">Concluir</button>
                    <button onClick={() => update(a, "cancelled")} className="rounded-md border border-border p-1.5 hover:bg-surface" title="Cancelar"><X className="h-3.5 w-3.5" /></button>
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
