import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Kanban, FileText, FileSignature, BriefcaseBusiness, Wrench, Wallet, Settings, PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Topbar } from './topbar';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { useIsMobile } from '@/lib/use-is-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const nav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  { to: '/app/leads', label: 'Leads', icon: Megaphone, resource: 'leads' },
  { to: '/app/pipeline', label: 'Pipeline', icon: Kanban, resource: 'pipeline' },
  { to: '/app/propostas', label: 'Propostas', icon: FileText, resource: 'propostas' },
  { to: '/app/contratos', label: 'Contratos', icon: FileSignature, resource: 'contratos' },
  { to: '/app/projetos', label: 'Projetos', icon: BriefcaseBusiness, resource: 'projetos' },
  { to: '/app/os', label: 'OS', icon: Wrench, resource: 'os' },
  { to: '/app/financeiro', label: 'Financeiro', icon: Wallet, resource: 'financeiro' },
  { to: '/app/config', label: 'Config', icon: Settings, resource: 'config' },
] as const;

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const isMobile = useIsMobile();

  const items = useMemo(() => nav.filter((i) => can(role, 'read', i.resource)), [role]);
  const navWidth = collapsed ? 'w-[84px]' : 'w-[250px]';
  const profileName = profile?.full_name ?? 'Usuário';
  const roleLabel = role ? String(role).replace('_', ' ') : 'acesso autorizado';

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const renderNav = ({ collapsedNav, onNavigate }: { collapsedNav: boolean; onNavigate?: () => void }) => {
    if (isMobile) {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.22),transparent_42%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.94))] px-5 pb-5 pt-6">
            <Link to="/app/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
                <img src="/logo.png" alt="weconect" className="h-9 w-9 rounded-lg object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">weconect</p>
                <p className="truncate text-2xl font-semibold tracking-tight text-white">Painel</p>
              </div>
            </Link>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
              <p className="truncate text-sm font-medium text-white">{profileName}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{roleLabel}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-3 px-2 text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">Navegação</div>
            <nav className="space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                      active
                        ? 'border-sky-400/30 bg-gradient-to-r from-sky-500/18 to-transparent text-white shadow-[0_12px_30px_rgba(14,165,233,0.12)]'
                        : 'border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${
                      active
                        ? 'border-sky-300/30 bg-sky-400/12 text-sky-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-300 group-hover:text-white'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[17px] font-medium">{item.label}</p>
                      <p className={`text-xs ${active ? 'text-sky-100/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        Acessar modulo
                      </p>
                    </div>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-3">
          <Link to="/app/dashboard" className="flex items-center gap-2" onClick={onNavigate}>
            <img src="/logo.png" alt="weconect" className={`rounded-md object-cover ${collapsedNav ? 'h-7 w-7' : 'h-8 w-8'}`} />
            {!collapsedNav && <span className="text-sm font-semibold tracking-tight">weconect</span>}
          </Link>
          <Button variant="ghost" size="icon" className="text-slate-100 hover:bg-slate-800" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                <Icon className="h-4 w-4" />
                {!collapsedNav && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </>
    );
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <Topbar
            mobileNavTrigger={
              <Button variant="outline" size="icon" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
                <Menu className="h-4 w-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="crm-mobile-nav border-r border-l-0 bg-slate-950 p-0 text-slate-100">
            {renderNav({ collapsedNav: false, onNavigate: () => setMobileNavOpen(false) })}
          </SheetContent>
        </Sheet>
        <main className="crm-app-main">
          <div className="crm-page-content p-3">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className={`fixed left-0 top-0 h-screen border-r bg-slate-950 text-slate-100 transition-all ${navWidth}`}>
        {renderNav({ collapsedNav: collapsed })}
      </aside>

      <main className={`crm-app-main transition-all ${collapsed ? 'ml-[84px]' : 'ml-[250px]'}`}>
        <Topbar />
        <div className="crm-page-content p-4 md:p-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
