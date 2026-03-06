import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Copy, Search, Trash2 } from 'lucide-react';
import { getProposals, softDeleteProposal, updateProposal, upsertProposal } from '@/features/propostas/api';
import { getLeads } from '@/features/leads/api';
import { getCondominios } from '@/features/condominios/api';
import { cacheKeys } from '@/lib/cacheKeys';
import { PageHeader } from '@/components/crm/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { currency, dateFormat } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { can, type Role } from '@/lib/permissions';
import { MapaLotes } from '@/features/propostas/mapa-lotes';
import { type ProposalScenario } from '@/features/propostas/proposal-engine';
import { ProposalComparison } from '@/features/propostas/proposal-ui';
import { useSelectedLot } from '@/features/propostas/selected-lot-store';

type ProposalItem = { description: string; qty: number; price: number };

function Kpi({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

const BASE_LOT_PREFIX = '[LOTE_BASE]';

export function PropostasPage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { selectedLot, setSelectedLot } = useSelectedLot();
  const role = profile?.role as Role | undefined;
  const canWrite = can(role, 'write', 'propostas');

  const [leadId, setLeadId] = useState('');
  const [condoId, setCondoId] = useState('');
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [manualDesc, setManualDesc] = useState('');
  const [manualQty, setManualQty] = useState(1);
  const [manualPrice, setManualPrice] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const proposalsQuery = useQuery({ queryKey: cacheKeys.proposals, queryFn: getProposals });
  const leadsQuery = useQuery({ queryKey: cacheKeys.leads, queryFn: getLeads });
  const condosQuery = useQuery({ queryKey: cacheKeys.condos, queryFn: getCondominios });

  useEffect(() => {
    if (condoId) return;
    const first = (condosQuery.data ?? [])[0];
    if (first?.id) setCondoId(first.id);
  }, [condoId, condosQuery.data]);

  useEffect(() => {
    setItems((prev) => {
      const withoutBase = prev.filter((item) => !item.description.startsWith(BASE_LOT_PREFIX));
      if (!selectedLot) return withoutBase;
      const lotItem: ProposalItem = {
        description: `${BASE_LOT_PREFIX} ${selectedLot.nome} (${selectedLot.area.toLocaleString('pt-BR')} m²)`,
        qty: 1,
        price: selectedLot.preco,
      };
      return [lotItem, ...withoutBase];
    });
  }, [selectedLot]);

  const proposals = (proposalsQuery.data ?? []) as any[];
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.qty * item.price, 0), [items]);
  const discountValue = useMemo(() => (subtotal * discountPercent) / 100, [subtotal, discountPercent]);
  const total = useMemo(() => Math.max(0, subtotal - discountValue), [subtotal, discountValue]);

  const kpis = useMemo(() => {
    const open = proposals.filter((p) => ['rascunho', 'enviada'].includes(p.status));
    const accepted = proposals.filter((p) => p.status === 'aceita');
    const refused = proposals.filter((p) => p.status === 'recusada');
    const pipelineValue = open.reduce((sum, p) => sum + Number(p.total ?? 0), 0);
    return {
      total: proposals.length,
      open: open.length,
      accepted: accepted.length,
      refused: refused.length,
      pipelineValue,
    };
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const byStatus = statusFilter === 'all' || proposal.status === statusFilter;
      const bySearch =
        !q ||
        String(proposal.id).toLowerCase().includes(q) ||
        String(proposal.leads?.name ?? '').toLowerCase().includes(q) ||
        String(proposal.condominiums?.name ?? '').toLowerCase().includes(q);
      return byStatus && bySearch;
    });
  }, [proposals, statusFilter, search]);

  const applyScenario = (scenario: ProposalScenario) => {
    if (scenario.id === 'avista') {
      setDiscountPercent(8);
      setItems([
        {
          description: `${BASE_LOT_PREFIX} ${selectedLot?.nome ?? 'Lote'} (à vista)`,
          qty: 1,
          price: scenario.valorLote,
        },
      ]);
      return;
    }
    setDiscountPercent(0);
    setItems([
      { description: `${BASE_LOT_PREFIX} ${selectedLot?.nome ?? 'Lote'} · Entrada`, qty: 1, price: scenario.entrada },
      { description: `${BASE_LOT_PREFIX} ${selectedLot?.nome ?? 'Lote'} · Parcelas`, qty: scenario.parcelas, price: scenario.valorParcela },
    ]);
  };

  const addManualItem = () => {
    if (!manualDesc.trim()) {
      toast.error('Informe a descrição do item.');
      return;
    }
    setItems((prev) => [...prev, { description: manualDesc.trim(), qty: Math.max(1, manualQty), price: Math.max(0, manualPrice) }]);
    setManualDesc('');
    setManualQty(1);
    setManualPrice(0);
  };

  const buildPdfAndUpload = async (proposalId: string, finalItems: ProposalItem[], finalTotal: number) => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Proposta Comercial', 14, 18);
    autoTable(doc, {
      startY: 28,
      head: [['Item', 'Qtd', 'Preço', 'Total']],
      body: finalItems.map((i) => [i.description.replace(BASE_LOT_PREFIX, '').trim(), String(i.qty), currency.format(i.price), currency.format(i.qty * i.price)]),
    });
    doc.text(`Subtotal: ${currency.format(subtotal)}`, 14, 132);
    doc.text(`Desconto: ${currency.format(discountValue)} (${discountPercent.toFixed(1)}%)`, 14, 140);
    doc.text(`Total: ${currency.format(finalTotal)}`, 14, 148);

    const blob = doc.output('blob');
    const path = `${proposalId}.pdf`;
    const { error: uploadError } = await supabase.storage.from('proposal-pdfs').upload(path, blob, { upsert: true, contentType: 'application/pdf' });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('proposal-pdfs').getPublicUrl(path);
    return data.publicUrl;
  };

  const generateMutation = useMutation({
    mutationFn: async (status: 'rascunho' | 'enviada') => {
      if (!condoId) throw new Error('Selecione um condomínio.');
      if (!items.length) throw new Error('Adicione itens para gerar a proposta.');

      const payloadItems = items.map((i) => ({ ...i, total: i.qty * i.price }));
      const proposal = await upsertProposal({
        lead_id: leadId || null,
        condominium_id: condoId || null,
        items: payloadItems,
        total,
        status,
      });

      const pdfUrl = await buildPdfAndUpload(proposal.id, items, total);
      await updateProposal(proposal.id, { pdf_url: pdfUrl, status });
    },
    onSuccess: () => {
      toast.success('Proposta gerada com sucesso.');
      setItems((prev) => prev.filter((item) => item.description.startsWith(BASE_LOT_PREFIX)));
      setDiscountPercent(0);
      void queryClient.invalidateQueries({ queryKey: cacheKeys.proposals });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'rascunho' | 'enviada' | 'aceita' | 'recusada' }) => updateProposal(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cacheKeys.proposals }),
    onError: (error) => toast.error((error as Error).message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (proposal: any) => {
      await upsertProposal({
        lead_id: proposal.lead_id,
        condominium_id: proposal.condominium_id,
        items: proposal.items,
        total: proposal.total,
        status: 'rascunho',
      });
    },
    onSuccess: () => {
      toast.success('Proposta duplicada.');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.proposals });
    },
  });

  const removeMutation = useMutation({
    mutationFn: softDeleteProposal,
    onSuccess: () => {
      toast.success('Proposta removida.');
      void queryClient.invalidateQueries({ queryKey: cacheKeys.proposals });
    },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Propostas" description="Mapa interativo + motor de propostas automáticas + gestão comercial" />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total" value={String(kpis.total)} helper="Propostas registradas" />
        <Kpi label="Abertas" value={String(kpis.open)} helper="Rascunho + Enviada" />
        <Kpi label="Aceitas" value={String(kpis.accepted)} helper="Fechamentos" />
        <Kpi label="Recusadas" value={String(kpis.refused)} helper="Perdas" />
        <Kpi label="Pipeline" value={currency.format(kpis.pipelineValue)} helper="Valor em aberto" />
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Construtor</TabsTrigger>
          <TabsTrigger value="management">Gestão</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-3">
          <Card>
            <CardHeader><CardTitle>Construir proposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger aria-label="Selecionar lead"><SelectValue placeholder="Lead (opcional)" /></SelectTrigger>
                  <SelectContent>{leadsQuery.data?.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setSelectedLot(null)}>Limpar lote</Button>
              </div>

              <MapaLotes selectedLot={selectedLot} onSelect={setSelectedLot} baseMapSrc="/images/mapa.jpeg" terrainMaskSrc="/images/terrenos.png" />
              <ProposalComparison selectedLot={selectedLot} onUseProposal={applyScenario} />

              <div className="rounded-xl border p-3">
                <p className="mb-2 text-sm font-semibold">Adicionar item manual</p>
                <div className="grid gap-2 md:grid-cols-[1.4fr_0.4fr_0.6fr_0.4fr]">
                  <Input value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} placeholder="Descrição" />
                  <Input type="number" value={manualQty} onChange={(e) => setManualQty(Number(e.target.value || 1))} placeholder="Qtd" />
                  <Input type="number" value={manualPrice} onChange={(e) => setManualPrice(Number(e.target.value || 0))} placeholder="Preço" />
                  <Button variant="outline" onClick={addManualItem}>Adicionar</Button>
                </div>
              </div>

              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={`${item.description}-${index}`}>
                        <TableCell>{item.description.replace(BASE_LOT_PREFIX, '').trim()}</TableCell>
                        <TableCell>
                          <Input className="h-8 w-20" type="number" min={1} value={item.qty} onChange={(e) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, qty: Number(e.target.value || 1) } : it)))} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 w-28" type="number" min={0} value={item.price} onChange={(e) => setItems((prev) => prev.map((it, i) => (i === index ? { ...it, price: Number(e.target.value || 0) } : it)))} />
                        </TableCell>
                        <TableCell>{currency.format(item.qty * item.price)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={5}><p className="py-3 text-center text-xs text-muted-foreground">Selecione um lote no mapa para iniciar.</p></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="grid gap-1 border-t p-3 text-sm md:grid-cols-3">
                  <p>Subtotal: <strong>{currency.format(subtotal)}</strong></p>
                  <p>Desconto: <strong>{currency.format(discountValue)} ({discountPercent.toFixed(1)}%)</strong></p>
                  <p className="text-right">Total final: <strong>{currency.format(total)}</strong></p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled={!canWrite || !items.length || generateMutation.isPending} onClick={() => generateMutation.mutate('rascunho')}>
                  Salvar rascunho
                </Button>
                <Button disabled={!canWrite || !items.length || generateMutation.isPending} onClick={() => generateMutation.mutate('enviada')}>
                  Gerar e marcar enviada
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="management" className="mt-3">
          <Card>
            <CardHeader><CardTitle>Gestão de propostas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por lead, condomínio ou id" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="rascunho">Rascunho</SelectItem>
                    <SelectItem value="enviada">Enviada</SelectItem>
                    <SelectItem value="aceita">Aceita</SelectItem>
                    <SelectItem value="recusada">Recusada</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-end text-xs text-muted-foreground">{filteredProposals.length} proposta(s)</div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PDF</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">#{String(p.id).slice(0, 8)}</TableCell>
                      <TableCell>{p.leads?.name ?? '-'}</TableCell>
                      <TableCell>{p.condominiums?.name ?? '-'}</TableCell>
                      <TableCell>{currency.format(Number(p.total ?? 0))}</TableCell>
                      <TableCell>
                        {canWrite ? (
                          <Select value={p.status} onValueChange={(status) => updateStatusMutation.mutate({ id: p.id, status: status as any })}>
                            <SelectTrigger className="h-8 w-full sm:w-[160px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rascunho">Rascunho</SelectItem>
                              <SelectItem value="enviada">Enviada</SelectItem>
                              <SelectItem value="aceita">Aceita</SelectItem>
                              <SelectItem value="recusada">Recusada</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{p.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.pdf_url ? (
                          <a className="text-primary underline" href={p.pdf_url} target="_blank" rel="noreferrer">
                            abrir
                          </a>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{dateFormat.format(new Date(p.created_at))}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => duplicateMutation.mutate(p)}>
                            <Copy className="mr-1 h-3.5 w-3.5" />Duplicar
                          </Button>
                          {canWrite && (
                            <Button size="sm" variant="destructive" onClick={() => removeMutation.mutate(String(p.id))}>
                              Remover
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredProposals.length && (
                    <TableRow>
                      <TableCell colSpan={8}><p className="py-6 text-center text-sm text-muted-foreground">Nenhuma proposta encontrada.</p></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
