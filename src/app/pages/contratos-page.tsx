import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeDollarSign, CalendarCheck2, CircleAlert, FileSignature, Search } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { getContracts, upsertContract, updateContract, softDeleteContract, createReceivablesForContract } from '@/features/contratos/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { currency, dateFormat } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { toast } from 'sonner';

const schema = z.object({
  proposal_id: z.string().min(1, 'Selecione a proposta'),
  status: z.enum(['ativo', 'pendente', 'cancelado']),
  start_date: z.string().min(1, 'Informe a data de início'),
  mrr: z.number().min(0),
  reajuste_percent: z.number().min(0),
});

type FormValues = z.infer<typeof schema>;

function KpiCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) {
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

export function ContratosPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const canWrite = can(role, 'write', 'contratos');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openNew, setOpenNew] = useState(false);

  const contractsQuery = useQuery({ queryKey: cacheKeys.contracts, queryFn: getContracts });
  const proposalsQuery = useQuery({
    queryKey: ['proposals-contractable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposals')
        .select('id,total,status,condominium_id,lead_id,created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const receivablesQuery = useQuery({
    queryKey: cacheKeys.receivables,
    queryFn: async () => {
      const { data, error } = await supabase.from('receivables').select('*').is('deleted_at', null);
      if (error) throw error;
      return data as any[];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'pendente',
      start_date: new Date().toISOString().slice(0, 10),
      mrr: 0,
      reajuste_percent: 6,
    },
  });

  const contracts = (contractsQuery.data ?? []) as any[];
  const receivables = (receivablesQuery.data ?? []) as any[];

  const kpis = useMemo(() => {
    const active = contracts.filter((c) => c.status === 'ativo');
    const pending = contracts.filter((c) => c.status === 'pendente');
    const canceled = contracts.filter((c) => c.status === 'cancelado');
    const mrr = active.reduce((sum, c) => sum + Number(c.mrr ?? 0), 0);
    const overdueReceivables = receivables.filter((r) => r.status === 'atrasado').length;
    return { total: contracts.length, active: active.length, pending: pending.length, canceled: canceled.length, mrr, overdueReceivables };
  }, [contracts, receivables]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contracts.filter((contract) => {
      const byStatus = statusFilter === 'all' || contract.status === statusFilter;
      const bySearch =
        !q ||
        String(contract.id).toLowerCase().includes(q) ||
        String(contract.proposal_id).toLowerCase().includes(q) ||
        String(contract.status).toLowerCase().includes(q);
      return byStatus && bySearch;
    });
  }, [contracts, search, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: upsertContract,
    onSuccess: () => {
      toast.success('Contrato salvo.');
      setOpenNew(false);
      form.reset({ status: 'pendente', start_date: new Date().toISOString().slice(0, 10), mrr: 0, reajuste_percent: 6 });
      void queryClient.invalidateQueries({ queryKey: cacheKeys.contracts });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ativo' | 'pendente' | 'cancelado' }) => updateContract(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.contracts }),
    onError: (error) => toast.error((error as Error).message),
  });

  const receivablesMutation = useMutation({
    mutationFn: ({ contractId, startDate, amount }: { contractId: string; startDate: string; amount: number }) =>
      createReceivablesForContract(contractId, startDate, amount, 12),
    onSuccess: () => {
      toast.success('Recebíveis (12 meses) gerados.');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.receivables });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const removeMutation = useMutation({
    mutationFn: softDeleteContract,
    onSuccess: () => {
      toast.success('Contrato removido.');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.contracts });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contratos"
        description="Carteira de contratos, status operacional e geração de recebíveis"
        actions={
          canWrite && (
            <Dialog open={openNew} onOpenChange={setOpenNew}>
              <DialogTrigger asChild><Button>Novo contrato</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar contrato</DialogTitle></DialogHeader>
                <form
                  className="grid gap-2"
                  onSubmit={form.handleSubmit((values) =>
                    saveMutation.mutate({
                      proposal_id: values.proposal_id,
                      status: values.status,
                      start_date: values.start_date,
                      mrr: values.mrr,
                      reajuste_percent: values.reajuste_percent,
                    }),
                  )}
                >
                  <Select onValueChange={(v) => form.setValue('proposal_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Proposta" /></SelectTrigger>
                    <SelectContent>
                      {(proposalsQuery.data ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>#{String(p.id).slice(0, 8)} · {p.status} · {currency.format(Number(p.total ?? 0))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input type="date" {...form.register('start_date')} />
                    <Select defaultValue="pendente" onValueChange={(v) => form.setValue('status', v as FormValues['status'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">pendente</SelectItem>
                        <SelectItem value="ativo">ativo</SelectItem>
                        <SelectItem value="cancelado">cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input type="number" placeholder="MRR" {...form.register('mrr', { valueAsNumber: true })} />
                    <Input type="number" placeholder="Reajuste %" {...form.register('reajuste_percent', { valueAsNumber: true })} />
                  </div>
                  <Button type="submit" disabled={saveMutation.isPending}>Salvar contrato</Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Contratos" value={String(kpis.total)} helper="Carteira total" icon={<FileSignature className="h-4 w-4" />} />
        <KpiCard label="Ativos" value={String(kpis.active)} helper="Em operação" icon={<CalendarCheck2 className="h-4 w-4" />} />
        <KpiCard label="Pendentes" value={String(kpis.pending)} helper="Aguardando ativação" icon={<CircleAlert className="h-4 w-4" />} />
        <KpiCard label="MRR ativo" value={currency.format(kpis.mrr)} helper="Receita recorrente" icon={<BadgeDollarSign className="h-4 w-4" />} />
        <KpiCard label="Recebíveis em atraso" value={String(kpis.overdueReceivables)} helper="Financeiro crítico" icon={<CircleAlert className="h-4 w-4" />} />
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por contrato/proposta/status" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">ativo</SelectItem>
              <SelectItem value="pendente">pendente</SelectItem>
              <SelectItem value="cancelado">cancelado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-xs text-muted-foreground">{filtered.length} contrato(s)</div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carteira de contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Proposta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Reajuste</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <p className="font-mono text-xs">#{String(contract.id).slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">Criado {contract.created_at ? dateFormat.format(new Date(contract.created_at)) : '-'}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">#{String(contract.proposal_id).slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{currency.format(Number(contract.proposals?.total ?? 0))}</p>
                  </TableCell>
                  <TableCell>
                    {canWrite ? (
                      <Select
                        value={contract.status}
                        onValueChange={(v) => statusMutation.mutate({ id: contract.id, status: v as 'ativo' | 'pendente' | 'cancelado' })}
                      >
                        <SelectTrigger className="h-8 w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">ativo</SelectItem>
                          <SelectItem value="pendente">pendente</SelectItem>
                          <SelectItem value="cancelado">cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{contract.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{contract.start_date ? dateFormat.format(new Date(contract.start_date)) : '-'}</TableCell>
                  <TableCell>{currency.format(Number(contract.mrr ?? 0))}</TableCell>
                  <TableCell>{Number(contract.reajuste_percent ?? 0).toFixed(2)}%</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => receivablesMutation.mutate({ contractId: contract.id, startDate: contract.start_date, amount: Number(contract.mrr ?? 0) })}
                        >
                          Gerar recebíveis
                        </Button>
                      )}
                      {canWrite && (
                        <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(String(contract.id))}>
                          Excluir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={7}><p className="py-6 text-center text-sm text-muted-foreground">Nenhum contrato encontrado.</p></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
