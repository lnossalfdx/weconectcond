import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { getProjects, softDeleteTask, updateProject, updateTask, upsertProject, upsertTask } from '@/features/projetos/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currency, dateFormat } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const PROJECT_STATUS = ['planejado', 'em_andamento', 'bloqueado', 'concluido'] as const;
const TASK_STATUS = ['pendente', 'em_andamento', 'concluida'] as const;
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

export function ProjetosPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const canWrite = can(role, 'write', 'projetos');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newContractId, setNewContractId] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<(typeof PROJECT_STATUS)[number]>('planejado');
  const [newProjectDue, setNewProjectDue] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState(NO_ASSIGNEE);
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const projectsQuery = useQuery({ queryKey: cacheKeys.projects, queryFn: getProjects });
  const usersQuery = useQuery({
    queryKey: ['profiles-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id,full_name').is('deleted_at', null).order('full_name');
      if (error) throw error;
      return data as any[];
    },
  });
  const contractsQuery = useQuery({
    queryKey: cacheKeys.contracts,
    queryFn: async () => {
      const { data, error } = await supabase.from('contracts').select('id,status,mrr').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const projects = (projectsQuery.data ?? []) as any[];

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((project) => {
      const byStatus = statusFilter === 'all' || project.status === statusFilter;
      const bySearch = !q || String(project.id).toLowerCase().includes(q) || String(project.contract_id).toLowerCase().includes(q);
      return byStatus && bySearch;
    });
  }, [projects, search, statusFilter]);

  useEffect(() => {
    if (!selectedProjectId && filteredProjects.length) setSelectedProjectId(filteredProjects[0].id);
    if (selectedProjectId && !filteredProjects.some((p) => p.id === selectedProjectId)) {
      setSelectedProjectId(filteredProjects[0]?.id ?? null);
    }
  }, [filteredProjects, selectedProjectId]);

  const selectedProject = useMemo(
    () => filteredProjects.find((p) => p.id === selectedProjectId) ?? null,
    [filteredProjects, selectedProjectId],
  );

  const tasks = useMemo(() => ((selectedProject?.tasks ?? []) as any[]).filter((t) => !t.deleted_at), [selectedProject]);

  const kpis = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'em_andamento').length;
    const blocked = projects.filter((p) => p.status === 'bloqueado').length;
    const allTasks = projects.flatMap((p) => (p.tasks ?? []) as any[]).filter((t) => !t.deleted_at);
    const completedTasks = allTasks.filter((t) => t.status === 'concluida').length;
    const overdueTasks = allTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'concluida').length;
    const completionRate = allTasks.length ? Math.round((completedTasks / allTasks.length) * 100) : 0;
    return { total, active, blocked, completionRate, overdueTasks };
  }, [projects]);

  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    const done = tasks.filter((t) => t.status === 'concluida').length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const projectMutation = useMutation({
    mutationFn: upsertProject,
    onSuccess: () => {
      toast.success('Projeto criado.');
      setNewProjectOpen(false);
      setNewContractId('');
      setNewProjectDue('');
      setNewProjectStatus('planejado');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.projects });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const projectStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProject(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.projects }),
    onError: (e) => toast.error((e as Error).message),
  });

  const taskCreateMutation = useMutation({
    mutationFn: () =>
      upsertTask({
        project_id: selectedProjectId!,
        title: newTaskTitle,
        status: 'pendente',
        assigned_to: newTaskAssignedTo === NO_ASSIGNEE ? null : newTaskAssignedTo,
        due_date: newTaskDueDate || null,
      }),
    onSuccess: () => {
      setNewTaskTitle('');
      setNewTaskAssignedTo(NO_ASSIGNEE);
      setNewTaskDueDate('');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.projects });
      toast.success('Tarefa criada.');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const taskUpdateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateTask(id, payload),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.projects }),
    onError: (e) => toast.error((e as Error).message),
  });

  const taskDeleteMutation = useMutation({
    mutationFn: softDeleteTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cacheKeys.projects });
      toast.success('Tarefa removida.');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projetos / Implantação"
        description="Acompanhamento da implantação com progresso, tarefas e riscos"
        actions={
          canWrite && (
            <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo projeto</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar projeto</DialogTitle></DialogHeader>
                <div className="grid gap-2">
                  <Select value={newContractId} onValueChange={setNewContractId}>
                    <SelectTrigger><SelectValue placeholder="Selecionar contrato" /></SelectTrigger>
                    <SelectContent>
                      {(contractsQuery.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>#{String(c.id).slice(0, 8)} · {c.status} · {currency.format(Number(c.mrr ?? 0))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newProjectStatus} onValueChange={(v) => setNewProjectStatus(v as (typeof PROJECT_STATUS)[number])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROJECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={newProjectDue} onChange={(e) => setNewProjectDue(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => projectMutation.mutate({ contract_id: newContractId, status: newProjectStatus, due_date: newProjectDue || null })}
                    disabled={!newContractId || projectMutation.isPending}
                  >
                    Salvar projeto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Projetos" value={String(kpis.total)} helper="Total na carteira" icon={<BriefcaseBusiness className="h-4 w-4" />} />
        <Kpi label="Em andamento" value={String(kpis.active)} helper="Implantações ativas" icon={<ClipboardList className="h-4 w-4" />} />
        <Kpi label="Bloqueados" value={String(kpis.blocked)} helper="Exigem atenção" icon={<AlertTriangle className="h-4 w-4" />} />
        <Kpi label="Conclusão tarefas" value={`${kpis.completionRate}%`} helper="Eficiência operacional" icon={<CheckCircle2 className="h-4 w-4" />} />
        <Kpi label="Tarefas em atraso" value={String(kpis.overdueTasks)} helper="Risco de prazo" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por id projeto/contrato" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PROJECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end text-xs text-muted-foreground">{filteredProjects.length} projeto(s)</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.42fr_0.58fr]">
        <Card className="h-[72vh] overflow-auto">
          <CardHeader><CardTitle className="text-sm">Projetos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                className={`w-full rounded-xl border p-3 text-left ${selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-mono text-xs">#{String(project.id).slice(0, 8)}</p>
                  <Badge variant="secondary">{project.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Contrato #{String(project.contract_id).slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">Prazo {project.due_date ? dateFormat.format(new Date(project.due_date)) : '-'}</p>
              </button>
            ))}
            {!filteredProjects.length && <p className="text-xs text-muted-foreground">Nenhum projeto encontrado.</p>}
          </CardContent>
        </Card>

        <Card className="h-[72vh] overflow-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm">
              <span>Detalhes do projeto</span>
              {selectedProject && canWrite && (
                <Select value={selectedProject.status} onValueChange={(v) => projectStatusMutation.mutate({ id: selectedProject.id, status: v })}>
                  <SelectTrigger className="h-8 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedProject ? (
              <>
                <div className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <p>Progresso do projeto</p>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tasks.filter((t) => t.status === 'concluida').length}/{tasks.length} tarefas concluídas
                  </p>
                </div>

                {canWrite && (
                  <div className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-semibold">Nova tarefa</p>
                    <div className="grid gap-2 md:grid-cols-4">
                      <Input className="md:col-span-2" placeholder="Título da tarefa" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
                      <Select value={newTaskAssignedTo} onValueChange={setNewTaskAssignedTo}>
                        <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ASSIGNEE}>Sem responsável</SelectItem>
                          {(usersQuery.data ?? []).map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
                    </div>
                    <Button className="mt-2" onClick={() => taskCreateMutation.mutate()} disabled={!newTaskTitle || taskCreateMutation.isPending}>Adicionar tarefa</Button>
                  </div>
                )}

                <div className="rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tarefa</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => {
                        const ownerName = (usersQuery.data ?? []).find((u) => u.user_id === task.assigned_to)?.full_name ?? '-';
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'concluida';
                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <p className="font-medium">{task.title}</p>
                              {isOverdue && <p className="text-xs text-destructive">Atrasada</p>}
                            </TableCell>
                            <TableCell>
                              {canWrite ? (
                                <Select value={task.status} onValueChange={(v) => taskUpdateMutation.mutate({ id: task.id, payload: { status: v } })}>
                                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                                  <SelectContent>{TASK_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="secondary">{task.status}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {canWrite ? (
                                <Select
                                  value={task.assigned_to ?? NO_ASSIGNEE}
                                  onValueChange={(v) => taskUpdateMutation.mutate({ id: task.id, payload: { assigned_to: v === NO_ASSIGNEE ? null : v } })}
                                >
                                  <SelectTrigger className="h-8 w-[170px]"><SelectValue placeholder="Responsável" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NO_ASSIGNEE}>Sem responsável</SelectItem>
                                    {(usersQuery.data ?? []).map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : ownerName}
                            </TableCell>
                            <TableCell>
                              {canWrite ? (
                                <Input className="h-8 w-[145px]" type="date" value={task.due_date ?? ''} onChange={(e) => taskUpdateMutation.mutate({ id: task.id, payload: { due_date: e.target.value || null } })} />
                              ) : (task.due_date ? dateFormat.format(new Date(task.due_date)) : '-')}
                            </TableCell>
                            <TableCell className="text-right">
                              {canWrite && (
                                <Button size="sm" variant="destructive" onClick={() => taskDeleteMutation.mutate(String(task.id))}>
                                  Excluir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!tasks.length && (
                        <TableRow>
                          <TableCell colSpan={5}><p className="py-6 text-center text-sm text-muted-foreground">Este projeto ainda não possui tarefas.</p></TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione um projeto à esquerda.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
