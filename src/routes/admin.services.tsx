import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyShop } from "@/lib/use-my-shop";
import { Plus, Trash2, ImagePlus, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({ component: ServicesPage });

function ServicesPage() {
  const { data: shop } = useMyShop();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [tab, setTab] = useState<"services" | "barbers">("services");

  const { data: services } = useQuery({
    queryKey: ["services", shop?.id], enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("services").select("*").eq("shop_id", shop!.id).order("created_at")).data ?? [],
  });
  const { data: barbers } = useQuery({
    queryKey: ["barbers", shop?.id], enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("barbers").select("*").eq("shop_id", shop!.id).order("created_at")).data ?? [],
  });

  const del = async (table: "services" | "barbers", id: string) => {
    if (!confirm("Eliminar?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: [table] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catálogo</h1>
        <button onClick={() => setEditing({})} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {tab === "services" ? <><Plus className="h-4 w-4" /> Novo serviço</> : <><UserPlus className="h-4 w-4" /> Novo barbeiro</>}
        </button>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setTab("services")} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "services" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"}`}>Serviços</button>
        <button onClick={() => setTab("barbers")} className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === "barbers" ? "border-accent text-foreground" : "border-transparent text-muted-foreground"}`}>Barbeiros</button>
      </div>

      {tab === "services" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services?.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="aspect-[4/3] bg-surface">
                {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover" loading="lazy" />
                  : <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus className="h-8 w-8" /></div>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{s.name}</h3>
                  <span className="font-display text-lg text-accent">{Number(s.price).toLocaleString("pt-MZ")} MZN</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{s.duration_minutes} min</p>
                {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setEditing(s)} className="flex-1 rounded-md border border-border py-2 text-xs font-medium hover:bg-surface">Editar</button>
                  <button onClick={() => del("services", s.id)} className="rounded-md border border-border p-2 hover:bg-surface"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {services?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Sem serviços. Crie o primeiro.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {barbers?.map((b) => (
            <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <div className="h-14 w-14 overflow-hidden rounded-full bg-surface">
                {b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground">{b.name[0]}</div>}
              </div>
              <div className="flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.active ? "Ativo" : "Inativo"}</p>
              </div>
              <button onClick={() => setEditing(b)} className="rounded-md border border-border px-3 py-1.5 text-xs">Editar</button>
              <button onClick={() => del("barbers", b.id)} className="rounded-md border border-border p-2"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {barbers?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">Sem barbeiros.</p>}
        </div>
      )}

      {editing !== null && (tab === "services" ? <ServiceModal item={editing} shopId={shop!.id} ownerId={shop!.owner_id} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["services"] }); }} />
        : <BarberModal item={editing} shopId={shop!.id} ownerId={shop!.owner_id} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["barbers"] }); }} />)}
    </div>
  );
}

function uploadFile(file: File, ownerId: string) {
  const ext = file.name.split(".").pop();
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
  return supabase.storage.from("shop-assets").upload(path, file).then(({ error }) => {
    if (error) throw error;
    return supabase.storage.from("shop-assets").getPublicUrl(path).data.publicUrl;
  });
}

function ServiceModal({ item, shopId, ownerId, onClose }: any) {
  const [form, setForm] = useState({ name: item.name ?? "", price: item.price ?? "", duration_minutes: item.duration_minutes ?? 30, description: item.description ?? "", image_url: item.image_url ?? "", active: item.active ?? true });
  const [saving, setSaving] = useState(false);

  const onFile = async (file: File) => {
    try { const url = await uploadFile(file, ownerId); setForm({ ...form, image_url: url }); toast.success("Imagem carregada"); }
    catch (e: any) { toast.error(e.message); }
  };
  const save = async () => {
    setSaving(true);
    const payload = { ...form, shop_id: shopId, price: Number(form.price), duration_minutes: Number(form.duration_minutes) };
    const { error } = item.id ? await supabase.from("services").update(payload).eq("id", item.id) : await supabase.from("services").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); onClose();
  };
  return <Modal onClose={onClose} title={item.id ? "Editar serviço" : "Novo serviço"}>
    <div className="space-y-3">
      <label className="block">
        <div className="aspect-[4/3] cursor-pointer overflow-hidden rounded-md border border-dashed border-border bg-surface">
          {form.image_url ? <img src={form.image_url} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground"><ImagePlus className="h-6 w-6" /> Carregar foto do corte</div>}
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Preço (MZN)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        <Input label="Duração (min)" type="number" value={form.duration_minutes} onChange={(v) => setForm({ ...form, duration_minutes: v })} />
      </div>
      <div>
        <label className="text-sm font-medium">Descrição</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background p-3 text-sm" rows={3} />
      </div>
      <button onClick={save} disabled={saving} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">{saving ? "A guardar..." : "Guardar"}</button>
    </div>
  </Modal>;
}

function BarberModal({ item, shopId, ownerId, onClose }: any) {
  const [form, setForm] = useState({ name: item.name ?? "", photo_url: item.photo_url ?? "", active: item.active ?? true });
  const [saving, setSaving] = useState(false);
  const onFile = async (file: File) => {
    try { const url = await uploadFile(file, ownerId); setForm({ ...form, photo_url: url }); }
    catch (e: any) { toast.error(e.message); }
  };
  const save = async () => {
    setSaving(true);
    const payload = { ...form, shop_id: shopId };
    const { error } = item.id ? await supabase.from("barbers").update(payload).eq("id", item.id) : await supabase.from("barbers").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); onClose();
  };
  return <Modal onClose={onClose} title={item.id ? "Editar barbeiro" : "Novo barbeiro"}>
    <div className="space-y-3">
      <label className="block">
        <div className="mx-auto h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-dashed border-border bg-surface">
          {form.photo_url ? <img src={form.photo_url} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus className="h-5 w-5" /></div>}
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      <Input label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
      <button onClick={save} disabled={saving} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">{saving ? "A guardar..." : "Guardar"}</button>
    </div>
  </Modal>;
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-card p-6 sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: any) {
  return <div><label className="text-sm font-medium">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>;
}
