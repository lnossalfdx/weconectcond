import { subDays, format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';

function groupBy<T>(arr: T[], key: (item: T) => string) {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export async function getDashboardKpis() {
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  const [
    leadsRes,
    proposalsRes,
    contractsRes,
    osRes,
    receivablesRes,
    stagesRes,
  ] = await Promise.all([
    supabase.from('leads').select('*').is('deleted_at', null),
    supabase.from('proposals').select('*').is('deleted_at', null),
    supabase.from('contracts').select('*').is('deleted_at', null),
    supabase.from('work_orders').select('*').is('deleted_at', null),
    supabase.from('receivables').select('*').is('deleted_at', null),
    supabase.from('pipeline_stages').select('*').is('deleted_at', null),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (proposalsRes.error) throw proposalsRes.error;
  if (contractsRes.error) throw contractsRes.error;
  if (osRes.error) throw osRes.error;
  if (receivablesRes.error) throw receivablesRes.error;
  if (stagesRes.error) throw stagesRes.error;

  const leads = (leadsRes.data ?? []) as any[];
  const proposals = (proposalsRes.data ?? []) as any[];
  const contracts = (contractsRes.data ?? []) as any[];
  const workOrders = (osRes.data ?? []) as any[];
  const receivables = (receivablesRes.data ?? []) as any[];
  const stages = (stagesRes.data ?? []) as any[];

  const newLeads = leads.filter((l) => new Date(l.created_at) >= new Date(sevenDaysAgo)).length;
  const openProposals = proposals.filter((p) => ['rascunho', 'enviada'].includes(p.status)).length;
  const mrr = contracts.filter((c) => c.status === 'ativo').reduce((sum, item) => sum + Number(item.mrr ?? 0), 0);
  const delayedOs = workOrders.filter((w) => ['aberta', 'em_andamento'].includes(w.status) && new Date(w.sla_due_at) < new Date()).length;

  const proposalClosed = proposals.filter((p) => ['aceita', 'recusada'].includes(p.status));
  const proposalWinRate = proposalClosed.length
    ? Math.round((proposalClosed.filter((p) => p.status === 'aceita').length / proposalClosed.length) * 100)
    : 0;

  const stageById = new Map(stages.map((s) => [s.id, s.name]));
  const leadsByStageMap = groupBy(leads, (lead) => stageById.get(lead.stage_id) ?? 'Sem estágio');
  const leadsByStage = Object.entries(leadsByStageMap).map(([name, value]) => ({ name, value }));

  const osByStatusMap = groupBy(workOrders, (w) => w.status ?? 'sem_status');
  const osByStatus = Object.entries(osByStatusMap).map(([name, value]) => ({ name, value }));

  const osByPriorityMap = groupBy(workOrders, (w) => w.priority ?? 'sem_prioridade');
  const osByPriority = Object.entries(osByPriorityMap).map(([name, value]) => ({ name, value }));

  const receivableSummary = {
    paid: receivables.filter((r) => r.status === 'pago').reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
    open: receivables.filter((r) => r.status === 'aberto').reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
    overdue: receivables.filter((r) => r.status === 'atrasado').reduce((sum, r) => sum + Number(r.amount ?? 0), 0),
  };

  const monthlyFinancialMap: Record<string, { month: string; paid: number; forecast: number }> = {};
  receivables.forEach((r) => {
    const month = format(new Date(r.due_date), 'MM/yyyy');
    if (!monthlyFinancialMap[month]) monthlyFinancialMap[month] = { month, paid: 0, forecast: 0 };
    monthlyFinancialMap[month].forecast += Number(r.amount ?? 0);
    if (r.status === 'pago') monthlyFinancialMap[month].paid += Number(r.amount ?? 0);
  });
  const monthlyFinancial = Object.values(monthlyFinancialMap).slice(-6);

  const upcomingOs = workOrders
    .filter((w) => ['aberta', 'em_andamento'].includes(w.status))
    .sort((a, b) => new Date(a.sla_due_at).getTime() - new Date(b.sla_due_at).getTime())
    .slice(0, 6);

  const recentProposals = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return {
    newLeads,
    openProposals,
    mrr,
    delayedOs,
    proposalWinRate,
    leadsByStage,
    osByStatus,
    osByPriority,
    receivableSummary,
    monthlyFinancial,
    upcomingOs,
    recentProposals,
  };
}
