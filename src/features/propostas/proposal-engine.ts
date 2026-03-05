export type LotStatus = 'Disponível' | 'Reservado' | 'Indisponível';

export type SelectedLot = {
  id: string;
  nome: string;
  area: number;
  preco: number;
  status: LotStatus;
};

export type ProposalScenario = {
  id: 'avista' | 'entrada24' | 'entrada60';
  nome: string;
  valorLote: number;
  descontoPercent: number;
  descontoValor: number;
  entrada: number;
  saldoFinanciado: number;
  jurosMensal: number;
  parcelas: number;
  valorParcela: number;
  totalPago: number;
  economiaVsMaiorTotal: number;
};

const toMoney = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function calcPricePMT(pv: number, jurosMensal: number, parcelas: number) {
  const safePv = toMoney(pv);
  const n = Math.max(0, parcelas);
  const i = Math.max(0, jurosMensal);
  if (!n || !safePv) return 0;
  if (!i) return safePv / n;
  const factor = (1 + i) ** n;
  const den = factor - 1;
  if (!Number.isFinite(factor) || !den) return safePv / n;
  return safePv * ((i * factor) / den);
}

export function buildStandardProposals(lot: SelectedLot): ProposalScenario[] {
  const valorLote = toMoney(lot.preco);

  const vistaDescontoPercent = 8;
  const vistaDescontoValor = valorLote * (vistaDescontoPercent / 100);
  const vistaFinal = toMoney(valorLote - vistaDescontoValor);

  const entrada24 = toMoney(valorLote * 0.2);
  const saldo24 = toMoney(valorLote - entrada24);
  const juros24 = 0.009;
  const parcelas24 = 24;
  const pmt24 = toMoney(calcPricePMT(saldo24, juros24, parcelas24));
  const total24 = toMoney(entrada24 + pmt24 * parcelas24);

  const entrada60 = toMoney(valorLote * 0.1);
  const saldo60 = toMoney(valorLote - entrada60);
  const juros60 = 0.012;
  const parcelas60 = 60;
  const pmt60 = toMoney(calcPricePMT(saldo60, juros60, parcelas60));
  const total60 = toMoney(entrada60 + pmt60 * parcelas60);

  const base: ProposalScenario[] = [
    {
      id: 'avista',
      nome: 'À vista (8% desconto)',
      valorLote,
      descontoPercent: vistaDescontoPercent,
      descontoValor: vistaDescontoValor,
      entrada: vistaFinal,
      saldoFinanciado: 0,
      jurosMensal: 0,
      parcelas: 0,
      valorParcela: 0,
      totalPago: vistaFinal,
      economiaVsMaiorTotal: 0,
    },
    {
      id: 'entrada24',
      nome: 'Entrada 20% + 24x (PRICE 0,9% a.m.)',
      valorLote,
      descontoPercent: 0,
      descontoValor: 0,
      entrada: entrada24,
      saldoFinanciado: saldo24,
      jurosMensal: juros24,
      parcelas: parcelas24,
      valorParcela: pmt24,
      totalPago: total24,
      economiaVsMaiorTotal: 0,
    },
    {
      id: 'entrada60',
      nome: 'Entrada 10% + 60x (PRICE 1,2% a.m.)',
      valorLote,
      descontoPercent: 0,
      descontoValor: 0,
      entrada: entrada60,
      saldoFinanciado: saldo60,
      jurosMensal: juros60,
      parcelas: parcelas60,
      valorParcela: pmt60,
      totalPago: total60,
      economiaVsMaiorTotal: 0,
    },
  ];

  const maxTotal = Math.max(...base.map((p) => p.totalPago), 0);
  return base.map((proposal) => ({
    ...proposal,
    economiaVsMaiorTotal: toMoney(maxTotal - proposal.totalPago),
  }));
}

export function buildProposalCopyText(lot: SelectedLot, proposal: ProposalScenario) {
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const jurosLabel = proposal.parcelas ? `${(proposal.jurosMensal * 100).toFixed(1)}% a.m.` : 'Sem juros';
  const parcelasLabel = proposal.parcelas ? `${proposal.parcelas}x de ${formatCurrency(proposal.valorParcela)}` : 'Pagamento único';
  return [
    `Lote: ${lot.nome} (${lot.id})`,
    `Área: ${lot.area.toLocaleString('pt-BR')} m²`,
    `Valor base: ${formatCurrency(lot.preco)}`,
    `Condição: ${proposal.nome}`,
    `Entrada: ${formatCurrency(proposal.entrada)}`,
    `Parcelas: ${parcelasLabel}`,
    `Juros: ${jurosLabel}`,
    `Total: ${formatCurrency(proposal.totalPago)}`,
  ].join('\n');
}
