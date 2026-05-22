import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Scissors, MapPin, Phone, Check, ImagePlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/$slug")({ component: PublicShop });

function PublicShop() {
  const { slug } = useParams({ from: "/$slug" });
  const [step, setStep] = useState<"service" | "barber" | "datetime" | "info" | "done">("service");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+258 ");
  const [submitting, setSubmitting] = useState(false);

  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ["shop", slug],
    queryFn: async () => (await supabase.from("shops").select("*").eq("slug", slug).eq("status", "active").maybeSingle()).data,
  });
  const { data: services } = useQuery({
    queryKey: ["pub-services", shop?.id], enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("services").select("*").eq("shop_id", shop!.id).eq("active", true)).data ?? [],
  });
  const { data: barbers } = useQuery({
    queryKey: ["pub-barbers", shop?.id], enabled: !!shop?.id,
    queryFn: async () => (await supabase.from("barbers").select("*").eq("shop_id", shop!.id).eq("active", true)).data ?? [],
  });

  const selectedService = useMemo(() => services?.find((s) => s.id === serviceId), [services, serviceId]);

  const timeSlots = useMemo(() => {
    const out: string[] = [];
    for (let h = 8; h < 19; h++) { out.push(`${String(h).padStart(2,"0")}:00`); out.push(`${String(h).padStart(2,"0")}:30`); }
    return out;
  }, []);

  const minDate = new Date().toISOString().split("T")[0];

  const submit = async () => {
    if (!shop || !selectedService) return;
    setSubmitting(true);
    const scheduled = new Date(`${date}T${time}`);
    // upsert client
    const cleanPhone = phone.trim();
    let clientId: string | null = null;
    const { data: existing } = await supabase.from("clients").select("id").eq("shop_id", shop.id).eq("phone", cleanPhone).maybeSingle();
    if (existing) clientId = existing.id;
    else {
      const { data: created } = await supabase.from("clients").insert({ shop_id: shop.id, name, phone: cleanPhone }).select("id").maybeSingle();
      clientId = created?.id ?? null;
    }
    const { error } = await supabase.from("appointments").insert({
      shop_id: shop.id, service_id: serviceId, barber_id: barberId, client_id: clientId,
      client_name: name, client_phone: cleanPhone, scheduled_at: scheduled.toISOString(),
      price: selectedService.price, status: "pending",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    if (clientId) await supabase.from("clients").update({ last_appointment_at: scheduled.toISOString() }).eq("id", clientId);
    setStep("done");
  };

  if (shopLoading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">A carregar...</div>;
  if (!shop) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <Scissors className="h-8 w-8 text-muted-foreground" />
      <p className="text-lg font-semibold">Barbearia não encontrada</p>
      <Link to="/" className="text-sm text-accent underline">Voltar a CorteJa</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero */}
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-6 py-8">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-sidebar-accent">
            {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-accent"><Scissors className="h-7 w-7" /></div>}
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-accent">{shop.name}</h1>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-sidebar-foreground/70">
              {shop.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {shop.city}</span>}
              {shop.phone && <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {shop.phone}</a>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2 text-xs">
          {["service","barber","datetime","info"].map((s, i) => {
            const active = step === s;
            const done = ["service","barber","datetime","info"].indexOf(step) > i || step === "done";
            return <div key={s} className={`flex h-7 items-center rounded-full px-3 ${active ? "bg-primary text-primary-foreground" : done ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground"}`}>{i+1}</div>;
          })}
        </div>

        {step === "service" && (
          <Section title="Escolha o seu corte">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {services?.map((s) => (
                <button key={s.id} onClick={() => { setServiceId(s.id); setStep("barber"); }}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-card text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${serviceId === s.id ? "border-accent ring-2 ring-accent" : "border-border hover:border-foreground/30"}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-surface">
                    {s.image_url ? <img src={s.image_url} alt={s.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                      : <div className="flex h-full items-center justify-center text-muted-foreground"><ImagePlus className="h-8 w-8" /></div>}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="font-semibold leading-tight">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                    <span className="mt-auto pt-1 font-display text-base text-accent sm:text-lg">{Number(s.price).toLocaleString("pt-MZ")} MZN</span>
                  </div>
                </button>
              ))}
              {services?.length === 0 && <p className="col-span-2 text-sm text-muted-foreground">Sem serviços disponíveis.</p>}
            </div>
          </Section>
        )}

        {step === "barber" && (
          <Section title="Escolha o barbeiro" onBack={() => setStep("service")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <button onClick={() => { setBarberId(null); setStep("datetime"); }}
                className={`rounded-xl border bg-card p-4 text-center transition ${barberId === null ? "border-accent ring-2 ring-accent" : "border-border"}`}>
                <div className="mx-auto h-14 w-14 rounded-full bg-surface" />
                <p className="mt-2 text-sm font-medium">Qualquer barbeiro</p>
              </button>
              {barbers?.map((b) => (
                <button key={b.id} onClick={() => { setBarberId(b.id); setStep("datetime"); }}
                  className={`rounded-xl border bg-card p-4 text-center transition ${barberId === b.id ? "border-accent ring-2 ring-accent" : "border-border"}`}>
                  <div className="mx-auto h-14 w-14 overflow-hidden rounded-full bg-surface">
                    {b.photo_url ? <img src={b.photo_url} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center font-semibold text-muted-foreground">{b.name[0]}</div>}
                  </div>
                  <p className="mt-2 text-sm font-medium">{b.name}</p>
                </button>
              ))}
            </div>
          </Section>
        )}

        {step === "datetime" && (
          <Section title="Escolha a data e hora" onBack={() => setStep("barber")}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Data</label>
                <input type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)}
                  style={{ colorScheme: "light" }}
                  className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" />
              </div>
              <div>
                <label className="text-sm font-medium">Hora</label>
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {timeSlots.map((t) => (
                    <button key={t} onClick={() => setTime(t)}
                      className={`h-10 rounded-md border text-sm ${time === t ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:border-foreground/30"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button disabled={!date || !time} onClick={() => setStep("info")} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">Continuar</button>
            </div>
          </Section>
        )}

        {step === "info" && (
          <Section title="Os seus dados" onBack={() => setStep("datetime")}>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" /></div>
              <div><label className="text-sm font-medium">Telefone (WhatsApp)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 84 123 4567" className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" />
                <p className="mt-1 text-xs text-muted-foreground">Pré-preenchido com +258 (Moçambique). Pode alterar o código se necessário.</p>
              </div>
              <div className="rounded-md border border-border bg-card p-3 text-sm">
                <p className="text-muted-foreground text-xs uppercase">Resumo</p>
                <p className="mt-1">{selectedService?.name} · {date} {time}</p>
                <p className="text-accent font-display text-lg">{Number(selectedService?.price ?? 0).toLocaleString("pt-MZ")} MZN</p>
              </div>
              <button disabled={!name || !phone || submitting} onClick={submit} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground disabled:opacity-50">
                {submitting ? "A reservar..." : "Confirmar reserva"}
              </button>
            </div>
          </Section>
        )}

        {step === "done" && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground"><Check className="h-6 w-6" /></div>
            <h2 className="mt-4 text-xl font-semibold">Reserva enviada!</h2>
            <p className="mt-2 text-sm text-muted-foreground">{shop.name} vai confirmar a sua marcação em breve.</p>
            <button onClick={() => { setStep("service"); setServiceId(null); setBarberId(null); setDate(""); setTime(""); setName(""); setPhone("+258 "); }}
              className="mt-6 inline-flex h-10 items-center rounded-md border border-border px-4 text-sm">Nova reserva</button>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({ children, title, onBack }: { children: React.ReactNode; title: string; onBack?: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {onBack && <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">← Voltar</button>}
      </div>
      {children}
    </section>
  );
}
