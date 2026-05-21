import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMyShop } from "@/lib/use-my-shop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const { data: shop, refetch } = useMyShop();
  const [form, setForm] = useState({ name: "", city: "", phone: "", logo_url: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (shop) setForm({ name: shop.name, city: shop.city ?? "", phone: shop.phone ?? "", logo_url: shop.logo_url ?? "" }); }, [shop]);

  const onLogo = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${shop!.owner_id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const url = supabase.storage.from("shop-assets").getPublicUrl(path).data.publicUrl;
    setForm({ ...form, logo_url: url });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("shops").update(form).eq("id", shop!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado");
    refetch();
  };

  if (!shop) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Definições</h1>
      <div className="max-w-xl rounded-xl border border-border bg-card p-6 space-y-4">
        <label className="block">
          <div className="text-sm font-medium">Logótipo</div>
          <div className="mt-2 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-md bg-surface">
              {form.logo_url ? <img src={form.logo_url} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus className="h-5 w-5" /></div>}
            </div>
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-surface">
              Carregar
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
            </label>
          </div>
        </label>
        <F label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <F label="Cidade" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <F label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <div className="rounded-md bg-surface p-3 text-xs text-muted-foreground">Endereço público: <span className="font-mono">/{shop.slug}</span></div>
        <button onClick={save} disabled={saving} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">{saving ? "A guardar..." : "Guardar"}</button>
      </div>
    </div>
  );
}

function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><label className="text-sm font-medium">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>;
}
