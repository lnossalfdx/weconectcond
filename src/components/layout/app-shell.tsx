import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Megaphone, Kanban, FileText, FileSignature, BriefcaseBusiness, Wrench, Wallet, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Topbar } from './topbar';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';

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
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;

  const items = useMemo(() => nav.filter((i) => can(role, 'read', i.resource)), [role]);

  return (
    <div className="min-h-screen bg-background">
      <aside className={`fixed left-0 top-0 h-screen border-r bg-slate-950 text-slate-100 transition-all ${collapsed ? 'w-[84px]' : 'w-[250px]'}`}>
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-3">
          <Link to="/app/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="weconect" className={`rounded-md object-cover ${collapsed ? 'h-7 w-7' : 'h-8 w-8'}`} />
            {!collapsed && <span className="text-sm font-semibold tracking-tight">weconect</span>}
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
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm ${active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'}`}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className={`transition-all ${collapsed ? 'ml-[84px]' : 'ml-[250px]'}`}>
        <Topbar />
        <div className="p-4 md:p-5">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
