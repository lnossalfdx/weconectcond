import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BadgeDollarSign, ClipboardCheck, Funnel, TrendingUp } from 'lucide-react';
import { getDashboardKpis } from '@/features/dashboard/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { currency, dateFormat } from '@/lib/utils';
import { PageHeader } from '@/components/crm/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#7c3aed'];

function KpiCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-soft">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="rounded-lg bg-muted p-1.5">{icon}</div>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const query = useQuery({ queryKey: cacheKeys.dashboard, queryFn: getDashboardKpis });

  const financialBars = useMemo(
    () =>
      (query.data?.monthlyFinancial ?? []).map((m) => ({
        month: m.month,
        Pago: m.paid,
        Previsto: m.forecast,
      })),
    [query.data?.monthlyFinancial],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description="Operação comercial, implantação e financeiro em uma única visão"
        actions={<Badge variant="outline">Atualizado em tempo real</Badge>}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Leads novos (7d)" value={String(query.data?.newLeads ?? 0)} subtitle="Novas entradas no funil" icon={<Funnel className="h-4 w-4" />} />
        <KpiCard title="Propostas abertas" value={String(query.data?.openProposals ?? 0)} subtitle="Rascunho e enviadas" icon={<ClipboardCheck className="h-4 w-4" />} />
        <KpiCard title="MRR ativo" value={currency.format(query.data?.mrr ?? 0)} subtitle="Contratos ativos" icon={<BadgeDollarSign className="h-4 w-4" />} />
        <KpiCard title="OS atrasadas" value={String(query.data?.delayedOs ?? 0)} subtitle="SLA vencido" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard title="Taxa de ganho" value={`${query.data?.proposalWinRate ?? 0}%`} subtitle="Propostas fechadas" icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader><CardTitle className="text-sm">Financeiro (previsto x recebido)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialBars}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => currency.format(Number(v))} />
                  <Bar dataKey="Previsto" fill="#94a3b8" radius={6} />
                  <Bar dataKey="Pago" fill="#4f46e5" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Funil por estágio</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={query.data?.leadsByStage ?? []} dataKey="value" nameKey="name" innerRadius={45} outerRadius={95} paddingAngle={2}>
                    {(query.data?.leadsByStage ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">OS por status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(query.data?.osByStatus ?? []).map((s: any) => (
              <div key={s.name} className="flex items-center justify-between rounded-md border p-2">
                <p className="text-sm capitalize">{String(s.name).replace('_', ' ')}</p>
                <Badge>{s.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Financeiro rápido</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Recebido</p><p className="text-sm font-semibold">{currency.format(query.data?.receivableSummary.paid ?? 0)}</p></div>
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Em aberto</p><p className="text-sm font-semibold">{currency.format(query.data?.receivableSummary.open ?? 0)}</p></div>
            <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Em atraso</p><p className="text-sm font-semibold">{currency.format(query.data?.receivableSummary.overdue ?? 0)}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">OS vencendo primeiro</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(query.data?.upcomingOs ?? []).map((os: any) => (
              <div key={os.id} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{os.category}</p>
                <p className="text-xs text-muted-foreground">{os.priority} · SLA {dateFormat.format(new Date(os.sla_due_at))}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Propostas recentes</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {(query.data?.recentProposals ?? []).map((p: any) => (
            <div key={p.id} className="rounded-md border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <p className="font-medium">Proposta {String(p.id).slice(0, 8)}</p>
                <Badge variant={p.status === 'aceita' ? 'success' : p.status === 'recusada' ? 'destructive' : 'secondary'}>{p.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{dateFormat.format(new Date(p.created_at))}</p>
              <p className="mt-1 font-semibold">{currency.format(Number(p.total ?? 0))}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
