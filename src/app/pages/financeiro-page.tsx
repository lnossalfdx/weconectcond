import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, CircleDollarSign, Search, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { bulkMarkAsPaid, getReceivables, markAsPaid, updateReceivable } from '@/features/financeiro/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currency, dateFormat } from '@/lib/utils';

function Kpi({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border bg-card shadow-soft">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="rounded-lg bg-muted p-1.5">{icon}</div>
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function daysOverdue(dueDate: string) {
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const query = useQuery({ queryKey: cacheKeys.receivables, queryFn: getReceivables });
  const rows = (query.data ?? []) as any[];

  const payMutation = useMutation({
    mutationFn: markAsPaid,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.receivables }),
  });

  const bulkPaidMutation = useMutation({
    mutationFn: bulkMarkAsPaid,
    onSuccess: () => {
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: cacheKeys.receivables });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateReceivable(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.receivables }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const byStatus = statusFilter === 'all' || r.status === statusFilter;
      const bySearch = !q || String(r.id).toLowerCase().includes(q) || String(r.contract_id).toLowerCase().includes(q);
      const byFrom = !fromDate || new Date(r.due_date) >= new Date(fromDate);
      const byTo = !toDate || new Date(r.due_date) <= new Date(toDate);
      return byStatus && bySearch && byFrom && byTo;
    });
  }, [rows, search, statusFilter, fromDate, toDate]);

  const kpis = useMemo(() => {
    const totalOpenValue = filtered.filter((r) => r.status !== 'pago').reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const totalPaidValue = filtered.filter((r) => r.status === 'pago').reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const overdueRows = filtered.filter((r) => r.status !== 'pago' && new Date(r.due_date) < new Date());
    const overdueValue = overdueRows.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    const mrr = filtered.reduce((sum, r) => sum + Number(r.contracts?.mrr ?? 0), 0);

    const aging = {
      d0_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    };

    overdueRows.forEach((r) => {
      const days = daysOverdue(r.due_date);
      const value = Number(r.amount ?? 0);
      if (days <= 30) aging.d0_30 += value;
      else if (days <= 60) aging.d31_60 += value;
      else if (days <= 90) aging.d61_90 += value;
      else aging.d90_plus += value;
    });

    return { totalOpenValue, totalPaidValue, overdueValue, mrr, aging };
  }, [filtered]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));

  return (
    <div className="space-y-4">
      <PageHeader title="Financeiro" description="Gestão de recebíveis, inadimplência e caixa recorrente" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="MRR (base filtrada)" value={currency.format(kpis.mrr)} helper="Soma do MRR vinculado" icon={<CircleDollarSign className="h-4 w-4" />} />
        <Kpi label="Em aberto" value={currency.format(kpis.totalOpenValue)} helper="Recebíveis não pagos" icon={<Wallet className="h-4 w-4" />} />
        <Kpi label="Recebido" value={currency.format(kpis.totalPaidValue)} helper="Pagamentos confirmados" icon={<CircleDollarSign className="h-4 w-4" />} />
        <Kpi label="Em atraso" value={currency.format(kpis.overdueValue)} helper="Risco de inadimplência" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Aging 0-30 dias</p>
            <p className="text-lg font-semibold">{currency.format(kpis.aging.d0_30)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Aging 31-60 dias</p>
            <p className="text-lg font-semibold">{currency.format(kpis.aging.d31_60)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Aging 61-90 dias</p>
            <p className="text-lg font-semibold">{currency.format(kpis.aging.d61_90)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Aging 90+ dias</p>
            <p className="text-lg font-semibold">{currency.format(kpis.aging.d90_plus)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-2xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por recebível/contrato" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="aberto">aberto</SelectItem>
              <SelectItem value="pago">pago</SelectItem>
              <SelectItem value="atrasado">atrasado</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setFromDate('');
              setToDate('');
              setSelectedIds([]);
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              {filtered.length} recebível(is) encontrados
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedIds.length || bulkPaidMutation.isPending}
                onClick={() => bulkPaidMutation.mutate(selectedIds)}
              >
                Marcar selecionados como pagos
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filtered.map((r) => r.id));
                      else setSelectedIds([]);
                    }}
                  />
                </TableHead>
                <TableHead>Recebível</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const isOverdue = row.status !== 'pago' && new Date(row.due_date) < new Date();
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds((prev) => [...prev, row.id]);
                          else setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">#{String(row.id).slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">#{String(row.contract_id).slice(0, 8)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{dateFormat.format(new Date(row.due_date))}</p>
                        {isOverdue && <p className="text-[11px] text-destructive">{daysOverdue(row.due_date)} dia(s) em atraso</p>}
                      </div>
                    </TableCell>
                    <TableCell>{currency.format(Number(row.amount ?? 0))}</TableCell>
                    <TableCell>
                      <Select value={row.status} onValueChange={(v) => updateMutation.mutate({ id: row.id, payload: { status: v } })}>
                        <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberto">aberto</SelectItem>
                          <SelectItem value="pago">pago</SelectItem>
                          <SelectItem value="atrasado">atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{row.paid_at ? dateFormat.format(new Date(row.paid_at)) : '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {row.status !== 'pago' ? (
                          <Button size="sm" onClick={() => payMutation.mutate(String(row.id))}>Marcar pago</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: row.id, payload: { status: 'aberto', paid_at: null } })}>
                            Reabrir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={8}><p className="py-6 text-center text-sm text-muted-foreground">Nenhum recebível encontrado.</p></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
