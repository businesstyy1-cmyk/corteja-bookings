import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Scissors } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

function SignupPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/admin" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalSlug = slug || slugify(shopName);
    if (!finalSlug) return toast.error("Indique um nome de barbearia.");
    setSubmitting(true);

    const { data: existing } = await supabase.from("shops").select("id").eq("slug", finalSlug).maybeSingle();
    if (existing) { setSubmitting(false); return toast.error("Este endereço já está em uso. Escolha outro."); }

    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/admin`, data: { display_name: shopName } },
    });
    if (signupErr || !signupData.user) { setSubmitting(false); return toast.error(signupErr?.message ?? "Erro ao criar conta."); }

    const { error: shopErr } = await supabase.from("shops").insert({
      owner_id: signupData.user.id, name: shopName, slug: finalSlug, city, phone, status: "active",
    });
    setSubmitting(false);
    if (shopErr) return toast.error(shopErr.message);
    toast.success("Barbearia criada!");
    nav({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <Scissors className="h-5 w-5 text-accent" />
          <span className="font-display text-xl font-bold">CorteJa</span>
        </Link>
        <div className="card-elev rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">Criar barbearia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Comece a receber reservas online.</p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <Field label="Nome da barbearia" value={shopName} onChange={(v) => { setShopName(v); setSlug(slugify(v)); }} required />
            <div>
              <label className="text-sm font-medium">Endereço público</label>
              <div className="mt-1 flex items-center rounded-md border border-input bg-background pr-3 focus-within:ring-2 focus-within:ring-ring">
                <span className="px-3 text-sm text-muted-foreground">corteja.app/</span>
                <input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required
                  className="h-11 w-full bg-transparent text-sm outline-none" placeholder="sobrinho" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade" value={city} onChange={setCity} placeholder="Maputo" />
              <Field label="Telefone" value={phone} onChange={setPhone} placeholder="+258 ..." />
            </div>
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Senha" type="password" value={password} onChange={setPassword} required />
            <button disabled={submitting} className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {submitting ? "A criar..." : "Criar conta"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-medium text-foreground underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input type={type} value={value} required={required} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
