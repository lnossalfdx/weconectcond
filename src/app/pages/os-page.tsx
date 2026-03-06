import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheck, Clock3, Headset, Search, Siren } from 'lucide-react';
import { getWorkOrders, upsertWorkOrder, softDeleteWorkOrder, updateWorkOrder } from '@/features/os/api';
import { getCondominios } from '@/features/condominios/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { PageHeader } from '@/components/crm/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Timeline } from '@/features/timeline/components';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { dateFormat, currency } from '@/lib/utils';
import { toast } from 'sonner';

const PRIORITIES = ['baixa', 'media', 'alta', 'critica'] as const;
const STATUSES = ['aberta', 'em_andamento', 'concluida', 'cancelada'] as const;
const NO_ASSIGNEE = '__none__';

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

function priorityVariant(priority: string): 'secondary' | 'warning' | 'destructive' {
  if (priority === 'critica') return 'destructive';
  if (priority === 'alta') return 'warning';
  return 'secondary';
}

export function OsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const canWrite = can(role, 'write', 'os');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const [condominiumId, setCondominiumId] = useState('');
  const [category, setCategory] = useState('Infra');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(NO_ASSIGNEE);
  const [cost, setCost] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const osQuery = useQuery({ queryKey: cacheKeys.os, queryFn: getWorkOrders });
  const condoQuery = useQuery({ queryKey: cacheKeys.condos, queryFn: getCondominios });
  const usersQuery = useQuery({
    queryKey: ['profiles-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id,full_name').is('deleted_at', null).order('full_name');
      if (error) throw error;
      return data as any[];
    },
  });

  const rows = (osQuery.data ?? []) as any[];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const bySearch =
        !q ||
        String(row.description ?? '').toLowerCase().includes(q) ||
        String(row.category ?? '').toLowerCase().includes(q) ||
        String(row.condominiums?.name ?? '').toLowerCase().includes(q);
      const byStatus = statusFilter === 'all' || row.status === statusFilter;
      const byPriority = priorityFilter === 'all' || row.priority === priorityFilter;
      const byOwner = ownerFilter === 'all' || row.assigned_to === ownerFilter;
      return bySearch && byStatus && byPriority && byOwner;
    });
  }, [rows, search, statusFilter, priorityFilter, ownerFilter]);

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((item) => item.id === selectedId)) setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selectedOs = useMemo(() => filtered.find((item) => item.id === selectedId) ?? null, [filtered, selectedId]);

  const kpis = useMemo(() => {
    const open = rows.filter((r) => r.status === 'aberta').length;
    const inProgress = rows.filter((r) => r.status === 'em_andamento').length;
    const done = rows.filter((r) => r.status === 'concluida').length;
    const delayed = rows.filter((r) => ['aberta', 'em_andamento'].includes(r.status) && new Date(r.sla_due_at) < new Date()).length;
    const critical = rows.filter((r) => r.priority === 'critica' && ['aberta', 'em_andamento'].includes(r.status)).length;
    return { open, inProgress, done, delayed, critical };
  }, [rows]);

  const createMutation = useMutation({
    mutationFn: () =>
      upsertWorkOrder({
        condominium_id: condominiumId,
        category,
        priority,
        description,
        assigned_to: assignedTo === NO_ASSIGNEE ? null : assignedTo,
        cost,
      }),
    onSuccess: () => {
      toast.success('OS criada com sucesso.');
      setOpenNew(false);
      setDescription('');
      setCost(0);
      setAssignedTo(NO_ASSIGNEE);
      void queryClient.invalidateQueries({ queryKey: cacheKeys.os });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateWorkOrder(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.os }),
    onError: (error) => toast.error((error as Error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: softDeleteWorkOrder,
    onSuccess: () => {
      toast.success('OS removida.');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.os });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  useEffect(() => {
    const channel = supabase
      .channel('os-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
        void queryClient.invalidateQueries({ queryKey: cacheKeys.os });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chamados / OS"
        description="Central de operação técnica com gestão de SLA, prioridade e execução"
        actions={
          canWrite && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild><Button>Nova OS</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Abrir novo chamado</DialogTitle></DialogHeader>
                <Select onValueChange={setCondominiumId}>
                  <SelectTrigger><SelectValue placeholder="Condomínio" /></SelectTrigger>
                  <SelectContent>{condoQuery.data?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Categoria" value={category} onChange={(e) => setCategory(e.target.value)} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select value={priority} onValueChange={(v) => setPriority(v as 'baixa' | 'media' | 'alta' | 'critica')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ASSIGNEE}>Sem responsável</SelectItem>
                      {(usersQuery.data ?? []).map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" placeholder="Custo previsto" value={cost} onChange={(e) => setCost(Number(e.target.value || 0))} />
                <Input placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Button onClick={() => createMutation.mutate()} disabled={!condominiumId || !description || createMutation.isPending}>Salvar OS</Button>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Abertas" value={String(kpis.open)} helper="Aguardando atendimento" icon={<Headset className="h-4 w-4" />} />
        <Kpi label="Em andamento" value={String(kpis.inProgress)} helper="Sendo executadas" icon={<Clock3 className="h-4 w-4" />} />
        <Kpi label="Concluídas" value={String(kpis.done)} helper="Finalizadas" icon={<CircleCheck className="h-4 w-4" />} />
        <Kpi label="SLA vencido" value={String(kpis.delayed)} helper="Risco operacional" icon={<AlertTriangle className="h-4 w-4" />} />
        <Kpi label="Críticas" value={String(kpis.critical)} helper="Prioridade máxima" icon={<Siren className="h-4 w-4" />} />
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por categoria, descrição, condomínio" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {(usersQuery.data ?? []).map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.62fr_0.38fr]">
        <Card className="h-[72vh] overflow-auto">
          <CardHeader><CardTitle className="text-sm">Fila de OS</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const isDelayed = ['aberta', 'em_andamento'].includes(row.status) && new Date(row.sla_due_at) < new Date();
                  return (
                    <TableRow key={row.id} className={selectedId === row.id ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <button className="text-left" onClick={() => setSelectedId(row.id)}>
                          <p className="font-medium">{row.category}</p>
                          <p className="text-xs text-muted-foreground">{row.condominiums?.name ?? '-'} · {row.description}</p>
                        </button>
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Select value={row.status} onValueChange={(v) => updateMutation.mutate({ id: row.id, payload: { status: v } })}>
                            <SelectTrigger className="h-8 w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{row.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Select value={row.priority} onValueChange={(v) => updateMutation.mutate({ id: row.id, payload: { priority: v } })}>
                            <SelectTrigger className="h-8 w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={priorityVariant(row.priority)}>{row.priority}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs">{dateFormat.format(new Date(row.sla_due_at))}</p>
                          {isDelayed && <p className="text-[11px] text-destructive">Vencido</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Select
                            value={row.assigned_to ?? NO_ASSIGNEE}
                            onValueChange={(v) => updateMutation.mutate({ id: row.id, payload: { assigned_to: v === NO_ASSIGNEE ? null : v } })}
                          >
                            <SelectTrigger className="h-8 w-full sm:w-[170px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_ASSIGNEE}>Sem responsável</SelectItem>
                              {(usersQuery.data ?? []).map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (row.profiles?.full_name ?? '-')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/app/os/${String(row.id)}`)}>Abrir</Button>
                          {canWrite && <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(String(row.id))}>Excluir</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={6}><p className="py-6 text-center text-sm text-muted-foreground">Nenhuma OS encontrada.</p></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-[72vh] overflow-auto">
          <CardHeader><CardTitle className="text-sm">Detalhes da OS</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selectedOs ? (
              <>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="font-semibold">{selectedOs.category}</p>
                  <p className="text-xs text-muted-foreground">{selectedOs.description}</p>
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-md border p-2">Condomínio<br /><strong>{selectedOs.condominiums?.name ?? '-'}</strong></div>
                    <div className="rounded-md border p-2">Custo<br /><strong>{currency.format(Number(selectedOs.cost ?? 0))}</strong></div>
                    <div className="rounded-md border p-2">Prioridade<br /><strong>{selectedOs.priority}</strong></div>
                    <div className="rounded-md border p-2">SLA<br /><strong>{dateFormat.format(new Date(selectedOs.sla_due_at))}</strong></div>
                  </div>
                </div>
                <Timeline entityType="work_order" entityId={selectedOs.id} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione uma OS para detalhes.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
