import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, BarChart3, CircleDashed, Funnel, UserRoundX, Users2 } from 'lucide-react';
import { cacheKeys } from '@/lib/cacheKeys';
import { getLeads, softDeleteLead, upsertLead, updateLead } from '@/features/leads/api';
import { getStages } from '@/features/pipeline/api';
import { PageHeader } from '@/components/crm/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Timeline } from '@/features/timeline/components';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { dateFormat } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Informe o nome'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().min(1),
  status: z.string().min(1),
  notes: z.string().optional(),
  stage_id: z.string().optional(),
  urgency: z.enum(['baixa', 'media', 'alta', 'critica']).optional(),
  units_hint: z.string().optional(),
  assigned_to: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS = ['novo', 'contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];

function KpiCard({ title, value, icon, helper }: { title: string; value: string | number; icon: React.ReactNode; helper: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{title}</p>
        <div className="rounded-lg bg-muted p-1.5">{icon}</div>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

export function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;

  const [openForm, setOpenForm] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'alto' | 'baixo'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const leadsQuery = useQuery({ queryKey: cacheKeys.leads, queryFn: getLeads });
  const stagesQuery = useQuery({ queryKey: cacheKeys.stages, queryFn: getStages });
  const usersQuery = useQuery({
    queryKey: ['profiles-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id,full_name').is('deleted_at', null).order('full_name');
      if (error) throw error;
      return data as any[];
    },
  });

  const rows = useMemo(() => (leadsQuery.data ?? []) as any[], [leadsQuery.data]);
  const selectedLead = useMemo(() => rows.find((l) => l.id === selectedLeadId) ?? null, [rows, selectedLeadId]);
  const editingLead = useMemo(() => rows.find((l) => l.id === editingLeadId) ?? null, [rows, editingLeadId]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', source: 'indicação', status: 'novo', notes: '' },
  });

  const saveMutation = useMutation({
    mutationFn: upsertLead,
    onSuccess: () => {
      toast.success('Lead salvo com sucesso');
      setOpenForm(false);
      setEditingLeadId(null);
      form.reset({ name: '', source: 'indicação', status: 'novo', notes: '' });
      void queryClient.invalidateQueries({ queryKey: cacheKeys.leads });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage_id }: { id: string; stage_id: string }) => updateLead(id, { stage_id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.leads }),
    onError: (error) => toast.error((error as Error).message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateLead(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.leads }),
    onError: (error) => toast.error((error as Error).message),
  });

  const removeMutation = useMutation({
    mutationFn: softDeleteLead,
    onSuccess: () => {
      toast.success('Lead removido');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.leads });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const sourceOptions = useMemo(() => ['all', ...new Set(rows.map((r) => r.source).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((lead) => {
      const matchesSearch =
        !q ||
        String(lead.name ?? '').toLowerCase().includes(q) ||
        String(lead.email ?? '').toLowerCase().includes(q) ||
        String(lead.phone ?? '').toLowerCase().includes(q);

      const matchesStage = stageFilter === 'all' || lead.stage_id === stageFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      const matchesOwner = ownerFilter === 'all' || lead.assigned_to === ownerFilter;
      const matchesUrgency = urgencyFilter === 'all' || lead.urgency === urgencyFilter;
      const matchesScore =
        scoreFilter === 'all' ||
        (scoreFilter === 'alto' && Number(lead.score ?? 0) >= 70) ||
        (scoreFilter === 'baixo' && Number(lead.score ?? 0) < 70);

      return matchesSearch && matchesStage && matchesSource && matchesOwner && matchesUrgency && matchesScore;
    });
  }, [rows, search, stageFilter, sourceFilter, ownerFilter, urgencyFilter, scoreFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const kpis = useMemo(() => {
    const highScore = rows.filter((r) => Number(r.score ?? 0) >= 70).length;
    const noOwner = rows.filter((r) => !r.assigned_to).length;
    const criticalUrgency = rows.filter((r) => r.urgency === 'critica').length;
    const won = rows.filter((r) => r.status === 'ganho').length;
    return { total: rows.length, highScore, noOwner, criticalUrgency, won };
  }, [rows]);

  const openCreate = () => {
    setEditingLeadId(null);
    form.reset({ name: '', source: 'indicação', status: 'novo', notes: '' });
    setOpenForm(true);
  };

  const openEdit = (lead: any) => {
    setEditingLeadId(lead.id);
    form.reset({
      id: lead.id,
      name: lead.name ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      source: lead.source ?? 'indicação',
      status: lead.status ?? 'novo',
      notes: lead.notes ?? '',
      stage_id: lead.stage_id ?? undefined,
      urgency: lead.urgency ?? undefined,
      units_hint: lead.units_hint ? String(lead.units_hint) : '',
      assigned_to: lead.assigned_to ?? undefined,
    });
    setOpenForm(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Gestão comercial completa: qualificação, priorização e avanço de funil"
        actions={
          can(role, 'write', 'leads') ? <Button onClick={openCreate}>Novo lead</Button> : null
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Total de leads" value={kpis.total} helper="Base ativa" icon={<Users2 className="h-4 w-4" />} />
        <KpiCard title="Score alto" value={kpis.highScore} helper="Score >= 70" icon={<BarChart3 className="h-4 w-4" />} />
        <KpiCard title="Sem responsável" value={kpis.noOwner} helper="Distribuição pendente" icon={<UserRoundX className="h-4 w-4" />} />
        <KpiCard title="Urgência crítica" value={kpis.criticalUrgency} helper="Prioridade máxima" icon={<AlertTriangle className="h-4 w-4" />} />
        <KpiCard title="Negócios ganhos" value={kpis.won} helper="Status ganho" icon={<CircleDashed className="h-4 w-4" />} />
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Funnel className="h-3.5 w-3.5" />Filtros avançados</div>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome, email, telefone" />
          <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Estágio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos estágios</SelectItem>
              {(stagesQuery.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              {sourceOptions.map((s) => <SelectItem key={s} value={s}>{s === 'all' ? 'Todas origens' : s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={(v) => { setOwnerFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {(usersQuery.data ?? []).map((u: any) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas urgências</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v as 'all' | 'alto' | 'baixo'); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos scores</SelectItem>
              <SelectItem value="alto">Alto (&gt;=70)</SelectItem>
              <SelectItem value="baixo">Baixo (&lt;70)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <button className="text-left" onClick={() => setSelectedLeadId(lead.id)}>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.email || lead.phone || '-'}</p>
                  </button>
                </TableCell>
                <TableCell>{lead.source || '-'}</TableCell>
                <TableCell>
                  {can(role, 'write', 'leads') ? (
                    <Select value={lead.stage_id ?? 'none'} onValueChange={(v) => v !== 'none' && stageMutation.mutate({ id: lead.id, stage_id: v })}>
                      <SelectTrigger className="h-8 w-full sm:w-[150px]"><SelectValue placeholder="Sem estágio" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem estágio</SelectItem>
                        {(stagesQuery.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (lead.pipeline_stages?.name ?? 'Sem estágio')}
                </TableCell>
                <TableCell>
                  {can(role, 'write', 'leads') ? (
                    <Select value={lead.status ?? 'novo'} onValueChange={(v) => statusMutation.mutate({ id: lead.id, status: v })}>
                      <SelectTrigger className="h-8 w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (lead.status ?? '-')}
                </TableCell>
                <TableCell><Badge variant={Number(lead.score ?? 0) >= 70 ? 'success' : 'secondary'}>{lead.score ?? 0}</Badge></TableCell>
                <TableCell>
                  <Badge variant={lead.urgency === 'critica' ? 'destructive' : lead.urgency === 'alta' ? 'warning' : 'secondary'}>{lead.urgency ?? 'n/a'}</Badge>
                </TableCell>
                <TableCell>{lead.profiles?.full_name ?? '-'}</TableCell>
                <TableCell>{lead.updated_at ? dateFormat.format(new Date(lead.updated_at)) : '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/app/leads/${String(lead.id)}`)}>Abrir</Button>
                    {can(role, 'write', 'leads') && <Button size="sm" variant="outline" onClick={() => openEdit(lead)}>Editar</Button>}
                    {can(role, 'write', 'leads') && <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(String(lead.id))}>Excluir</Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!paged.length && (
              <TableRow>
                <TableCell colSpan={9}>
                  <div className="py-6 text-center text-sm text-muted-foreground">Nenhum lead encontrado com os filtros atuais.</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t p-3 text-sm">
          <p className="text-muted-foreground">{filtered.length} lead(s) filtrados</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      </div>

      {selectedLead && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <p className="mb-2 text-sm font-semibold">Resumo do lead</p>
            <div className="grid gap-2 text-sm">
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Nome</p><p>{selectedLead.name}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Contato</p><p>{selectedLead.email || selectedLead.phone || '-'}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Origem</p><p>{selectedLead.source || '-'}</p></div>
              <div className="rounded-md border p-2"><p className="text-xs text-muted-foreground">Notas</p><p>{selectedLead.notes || 'Sem notas'}</p></div>
            </div>
          </div>
          <Timeline entityType="lead" entityId={selectedLead.id} />
        </div>
      )}

      <Sheet open={openForm} onOpenChange={setOpenForm}>
        <SheetContent>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{editingLead ? 'Editar lead' : 'Novo lead'}</h3>
            <p className="text-sm text-muted-foreground">Preencha os dados comerciais e de priorização</p>
          </div>

          <form
            className="grid gap-2"
            onSubmit={form.handleSubmit((values) =>
              saveMutation.mutate({
                ...values,
                email: values.email || null,
                phone: values.phone || null,
                units_hint: values.units_hint ? Number(values.units_hint) : null,
                urgency: values.urgency ?? null,
                stage_id: values.stage_id ?? null,
                assigned_to: values.assigned_to ?? null,
              }),
            )}
          >
            <Input placeholder="Nome" {...form.register('name')} />
            <Input placeholder="Email" {...form.register('email')} />
            <Input placeholder="Telefone" {...form.register('phone')} />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Origem" {...form.register('source')} />
              <Input placeholder="Unidades estimadas" type="number" {...form.register('units_hint')} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={form.watch('status') ?? 'novo'} onValueChange={(v) => form.setValue('status', v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.watch('urgency') ?? 'none'} onValueChange={(v) => form.setValue('urgency', v === 'none' ? undefined : (v as FormValues['urgency']))}>
                <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem urgência</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select value={form.watch('stage_id') ?? 'none'} onValueChange={(v) => form.setValue('stage_id', v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Estágio" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem estágio</SelectItem>
                  {(stagesQuery.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.watch('assigned_to') ?? 'none'} onValueChange={(v) => form.setValue('assigned_to', v === 'none' ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {(usersQuery.data ?? []).map((u: any) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Notas do lead" {...form.register('notes')} />
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>Salvar lead</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
