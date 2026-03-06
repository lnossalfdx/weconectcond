import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, useDraggable, useDroppable, closestCorners, DragOverlay } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, TrendingUp, CircleAlert, CircleCheck, Funnel } from 'lucide-react';
import { PageHeader } from '@/components/crm/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cacheKeys } from '@/lib/cacheKeys';
import { getPipelineCards, getStages, moveCard } from '@/features/pipeline/api';
import { supabase } from '@/lib/supabaseClient';
import { cn, dateFormat } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';

function scoreBadgeVariant(score: number): 'success' | 'warning' | 'secondary' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'secondary';
}

function LeadCard({
  lead,
  canDrag,
  ownerName,
  stages,
  onQuickMove,
}: {
  lead: any;
  canDrag: boolean;
  ownerName: string;
  stages: any[];
  onQuickMove: (leadId: string, stageId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { stageId: lead.stage_id },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn('rounded-xl border bg-card p-3 shadow-sm transition', isDragging && 'opacity-30')}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="line-clamp-1 text-sm font-semibold">{lead.name}</p>
          <p className="text-xs text-muted-foreground">{lead.email || lead.phone || 'Sem contato'}</p>
        </div>
        {canDrag && (
          <button className="cursor-grab rounded-md border p-1 hover:bg-muted" {...attributes} {...listeners} title="Arrastar">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <Badge variant="secondary">{lead.source || 'sem origem'}</Badge>
        <Badge variant={scoreBadgeVariant(Number(lead.score ?? 0))}>{lead.score ?? 0}</Badge>
        <Badge variant={lead.urgency === 'critica' ? 'destructive' : lead.urgency === 'alta' ? 'warning' : 'secondary'}>
          {lead.urgency || 'n/a'}
        </Badge>
      </div>

      <div className="mb-3 text-xs text-muted-foreground">
        <p>Responsável: {ownerName}</p>
        <p>Atualizado: {lead.updated_at ? dateFormat.format(new Date(lead.updated_at)) : '-'}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={`/app/leads/${lead.id}`}>Abrir</Link>
        </Button>
        {canDrag ? (
          <Select value={lead.stage_id ?? 'none'} onValueChange={(v) => v !== 'none' && onQuickMove(lead.id, v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Mover" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem estágio</SelectItem>
              {stages.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button size="sm" variant="outline" disabled>Somente leitura</Button>
        )}
      </div>
    </div>
  );
}

function StageDropZone({ stageId, children, className }: { stageId: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return <div ref={setNodeRef} className={cn(className, isOver && 'ring-2 ring-primary/40')}>{children}</div>;
}

function Kpi({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function PipelinePage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const role = profile?.role as Role | undefined;
  const canWrite = can(role, 'write', 'pipeline');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const stagesQuery = useQuery({ queryKey: cacheKeys.stages, queryFn: getStages });
  const cardsQuery = useQuery({ queryKey: cacheKeys.leads, queryFn: getPipelineCards });
  const usersQuery = useQuery({
    queryKey: ['profiles-lite'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id,full_name').is('deleted_at', null).order('full_name');
      if (error) throw error;
      return data as any[];
    },
  });

  const allLeads = (cardsQuery.data ?? []) as any[];
  const ownersById = useMemo(() => new Map((usersQuery.data ?? []).map((u: any) => [u.user_id, u.full_name])), [usersQuery.data]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeads.filter((lead) => {
      const bySearch = !q || String(lead.name ?? '').toLowerCase().includes(q) || String(lead.email ?? '').toLowerCase().includes(q);
      const bySource = sourceFilter === 'all' || lead.source === sourceFilter;
      const byOwner = ownerFilter === 'all' || lead.assigned_to === ownerFilter;
      const byUrgency = urgencyFilter === 'all' || lead.urgency === urgencyFilter;
      return bySearch && bySource && byOwner && byUrgency;
    });
  }, [allLeads, search, sourceFilter, ownerFilter, urgencyFilter]);

  const activeLead = useMemo(() => filteredLeads.find((l) => l.id === activeId) ?? null, [filteredLeads, activeId]);

  const sourceOptions = useMemo(() => ['all', ...new Set(allLeads.map((l) => l.source).filter(Boolean))], [allLeads]);

  const stageSummary = useMemo(() => {
    const stages = (stagesQuery.data ?? []) as any[];
    return stages.map((stage) => {
      const list = filteredLeads.filter((l) => l.stage_id === stage.id);
      const scoreAvg = list.length ? Math.round(list.reduce((sum, l) => sum + Number(l.score ?? 0), 0) / list.length) : 0;
      const potentialUnits = list.reduce((sum, l) => sum + Number(l.units_hint ?? 0), 0);
      return { stage, list, scoreAvg, potentialUnits };
    });
  }, [stagesQuery.data, filteredLeads]);

  const moveMutation = useMutation({
    mutationFn: ({ id, stage_id }: { id: string; stage_id: string }) => moveCard(id, stage_id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.leads }),
  });

  useEffect(() => {
    const channel = supabase
      .channel('pipeline-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        void queryClient.invalidateQueries({ queryKey: cacheKeys.leads });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (!canWrite) {
      setActiveId(null);
      return;
    }

    const overId = event.over?.id;
    if (overId && typeof overId === 'string') {
      const directStage = ((stagesQuery.data ?? []) as any[]).find((s: any) => s.id === overId)?.id ?? null;
      const stageFromCard = filteredLeads.find((l) => l.id === overId)?.stage_id ?? null;
      const nextStage = directStage ?? stageFromCard;
      if (nextStage) {
        moveMutation.mutate({ id: String(event.active.id), stage_id: nextStage });
      }
    }
    setActiveId(null);
  };

  const onDragCancel = () => setActiveId(null);

  const wonCount = stageSummary.find((s) => s.stage.is_won)?.list.length ?? 0;
  const lostCount = stageSummary.find((s) => s.stage.is_lost)?.list.length ?? 0;
  const scoreHighCount = filteredLeads.filter((l) => Number(l.score ?? 0) >= 80).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        description="Gestão visual do funil com ações rápidas e priorização comercial"
        actions={<Badge variant={canWrite ? 'default' : 'secondary'}>{canWrite ? 'Edição habilitada' : 'Somente leitura'}</Badge>}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Leads no funil" value={filteredLeads.length} icon={<Funnel className="h-4 w-4 text-muted-foreground" />} />
        <Kpi label="Score alto (>=80)" value={scoreHighCount} icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
        <Kpi label="Ganhos" value={wonCount} icon={<CircleCheck className="h-4 w-4 text-muted-foreground" />} />
        <Kpi label="Perdidos" value={lostCount} icon={<CircleAlert className="h-4 w-4 text-muted-foreground" />} />
      </div>

      <div className="rounded-2xl border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar lead por nome/email" />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              {sourceOptions.map((s) => (
                <SelectItem key={s} value={s}>{s === 'all' ? 'Todas origens' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos responsáveis</SelectItem>
              {(usersQuery.data ?? []).map((u: any) => (
                <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger><SelectValue placeholder="Urgência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas urgências</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DndContext collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <div className="grid gap-3 md:grid-cols-4">
          {stageSummary.map(({ stage, list, scoreAvg, potentialUnits }) => (
            <StageDropZone key={stage.id} stageId={stage.id}>
              <Card id={stage.id} className="h-[65vh] overflow-auto bg-muted/30 md:h-[74vh]">
                <CardHeader className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
                  <CardTitle className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{stage.name}</span>
                      <Badge variant="outline">{list.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      <Badge variant="secondary">Score méd. {scoreAvg}</Badge>
                      <Badge variant="secondary">Unidades {potentialUnits}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-3">
                  {list.map((lead: any) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      canDrag={canWrite}
                      ownerName={ownersById.get(lead.assigned_to) ?? 'Sem responsável'}
                      stages={(stagesQuery.data ?? []) as any[]}
                      onQuickMove={(leadId, stageId) => moveMutation.mutate({ id: leadId, stage_id: stageId })}
                    />
                  ))}
                  {!list.length && <div className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">Sem leads neste estágio</div>}
                </CardContent>
              </Card>
            </StageDropZone>
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="z-[9999] w-[280px] rounded-xl border bg-card p-3 shadow-2xl ring-2 ring-primary/30 sm:w-[320px]">
              <p className="text-sm font-semibold">{activeLead.name}</p>
              <p className="text-xs text-muted-foreground">{activeLead.email || activeLead.phone || 'Sem contato'}</p>
              <div className="mt-2 flex gap-1">
                <Badge variant="secondary">{activeLead.source}</Badge>
                <Badge>{activeLead.score}</Badge>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
