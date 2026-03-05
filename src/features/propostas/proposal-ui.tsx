import { useMemo, useState } from 'react';
import { Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { buildProposalCopyText, buildStandardProposals, type ProposalScenario, type SelectedLot } from './proposal-engine';

type Props = {
  selectedLot: SelectedLot | null;
  onUseProposal: (proposal: ProposalScenario) => void;
};

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProposalComparison({ selectedLot, onUseProposal }: Props) {
  const [detail, setDetail] = useState<ProposalScenario | null>(null);
  const proposals = useMemo(() => (selectedLot ? buildStandardProposals(selectedLot) : []), [selectedLot]);

  const copyProposal = async (proposal: ProposalScenario) => {
    if (!selectedLot) return;
    const text = buildProposalCopyText(selectedLot, proposal);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Proposta copiada para compartilhar.');
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  if (!selectedLot) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhum lote selecionado. Clique em um terreno no mapa para gerar propostas automaticamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-card p-3">
        <p className="text-xs text-muted-foreground">Lote selecionado</p>
        <p className="text-sm font-semibold">{selectedLot.nome} · {selectedLot.area.toLocaleString('pt-BR')} m² · {brl(selectedLot.preco)}</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {proposals.map((proposal) => (
          <Card key={proposal.id} className="rounded-2xl border bg-card">
            <CardHeader className="space-y-2 pb-2">
              <CardTitle className="text-sm leading-5">{proposal.nome}</CardTitle>
              <Badge variant="secondary">{proposal.parcelas ? `${proposal.parcelas} parcelas` : 'Pagamento único'}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Valor do lote: <strong className="text-foreground">{brl(proposal.valorLote)}</strong></p>
              <p className="text-xs text-muted-foreground">Desconto: <strong className="text-foreground">{proposal.descontoPercent ? `${proposal.descontoPercent}% (${brl(proposal.descontoValor)})` : 'Sem desconto'}</strong></p>
              <p className="text-xs text-muted-foreground">Entrada: <strong className="text-foreground">{brl(proposal.entrada)}</strong></p>
              <p className="text-xs text-muted-foreground">Saldo financiado: <strong className="text-foreground">{brl(proposal.saldoFinanciado)}</strong></p>
              <p className="text-xs text-muted-foreground">Juros mensal: <strong className="text-foreground">{proposal.parcelas ? `${(proposal.jurosMensal * 100).toFixed(1)}% a.m.` : 'Sem juros'}</strong></p>
              <p className="text-xs text-muted-foreground">Parcela: <strong className="text-foreground">{proposal.parcelas ? brl(proposal.valorParcela) : '-'}</strong></p>
              <p className="text-xs text-muted-foreground">Total pago: <strong className="text-foreground">{brl(proposal.totalPago)}</strong></p>
              <p className="text-xs text-success">Economia vs maior total: <strong>{brl(proposal.economiaVsMaiorTotal)}</strong></p>

              <div className="grid gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" onClick={() => setDetail(proposal)}><FileText className="mr-2 h-4 w-4" />Gerar proposta detalhada</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Proposta detalhada</DialogTitle></DialogHeader>
                    {detail && (
                      <div className="space-y-2 text-sm">
                        <p><strong>{detail.nome}</strong></p>
                        <p>Lote: {selectedLot.nome}</p>
                        <p>Área: {selectedLot.area.toLocaleString('pt-BR')} m²</p>
                        <p>Valor base: {brl(detail.valorLote)}</p>
                        <p>Entrada: {brl(detail.entrada)}</p>
                        <p>Saldo financiado: {brl(detail.saldoFinanciado)}</p>
                        <p>Juros: {detail.parcelas ? `${(detail.jurosMensal * 100).toFixed(1)}% a.m.` : 'Sem juros'}</p>
                        <p>Parcelas: {detail.parcelas ? `${detail.parcelas}x de ${brl(detail.valorParcela)}` : 'Pagamento único'}</p>
                        <p>Total pago: {brl(detail.totalPago)}</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <Button onClick={() => void copyProposal(proposal)}><Copy className="mr-2 h-4 w-4" />Copiar proposta</Button>
                <Button variant="secondary" onClick={() => onUseProposal(proposal)}>Usar esta condição</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
