import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/super")({ component: SuperAdmin });

function SuperAdmin() {
  const { isSuperAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const { data: shops } = useQuery({
    queryKey: ["all-shops"], enabled: isSuperAdmin,
    queryFn: async () => (await supabase.from("shops").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("shops").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    qc.invalidateQueries({ queryKey: ["all-shops"] });
  };

  if (loading) return null;
  if (!isSuperAdmin) return <p className="text-sm text-muted-foreground">Acesso restrito.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Super Admin</h1>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs uppercase text-muted-foreground">
            <tr><th className="p-3 text-left">Barbearia</th><th className="p-3 text-left">Cidade</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shops?.map((s) => (
              <tr key={s.id}>
                <td className="p-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">/{s.slug}</div></td>
                <td className="p-3">{s.city ?? "—"}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setStatus(s.id, "active")} className="rounded-md border border-border px-2 py-1 text-xs">Ativar</button>
                    <button onClick={() => setStatus(s.id, "suspended")} className="rounded-md border border-border px-2 py-1 text-xs">Suspender</button>
                    <button onClick={() => setStatus(s.id, "blocked")} className="rounded-md border border-border px-2 py-1 text-xs">Bloquear</button>
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
