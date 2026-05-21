import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMyShop } from "@/lib/use-my-shop";
import { LayoutDashboard, CalendarDays, Scissors, Users, Settings, LogOut, ShieldCheck, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Reservas", icon: CalendarDays },
  { to: "/admin/services", label: "Serviços", icon: Scissors },
  { to: "/admin/clients", label: "Clientes", icon: Users },
  { to: "/admin/settings", label: "Definições", icon: Settings },
];

function AdminLayout() {
  const { user, loading, isSuperAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data: shop } = useMyShop();

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
            <Scissors className="h-5 w-5 text-accent" />
            <span className="font-display text-lg font-bold">CorteJa</span>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${active ? "bg-sidebar-accent text-accent" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              );
            })}
            {isSuperAdmin && (
              <Link to="/admin/super" className={`mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${location.pathname.startsWith("/admin/super") ? "bg-sidebar-accent text-accent" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"}`}>
                <ShieldCheck className="h-4 w-4" /> Super Admin
              </Link>
            )}
          </nav>
          <div className="border-t border-sidebar-border p-3">
            {shop && (
              <a href={`/${shop.slug}`} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent">
                <ExternalLink className="h-3.5 w-3.5" /> Ver página pública
              </a>
            )}
            <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Mobile top bar */}
          <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-accent" />
              <span className="font-display text-base font-bold">CorteJa</span>
            </div>
            <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="text-xs text-muted-foreground">Sair</button>
          </div>
          {/* Mobile nav */}
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
            {nav.map((n) => {
              const active = n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to);
              return (
                <Link key={n.to} to={n.to} className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {n.label}
                </Link>
              );
            })}
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
