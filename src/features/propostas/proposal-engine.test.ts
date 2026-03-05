import { describe, expect, it } from 'vitest';
import { buildStandardProposals, calcPricePMT } from './proposal-engine';

describe('proposal-engine', () => {
  it('calcula PMT PRICE sem NaN', () => {
    const pmt = calcPricePMT(100000, 0.01, 24);
    expect(Number.isFinite(pmt)).toBe(true);
    expect(pmt).toBeGreaterThan(0);
  });

  it('gera 3 propostas padrão com regras obrigatórias', () => {
    const proposals = buildStandardProposals({
      id: '1',
      nome: 'Lote 1',
      area: 300,
      preco: 500000,
      status: 'Disponível',
    });
    expect(proposals).toHaveLength(3);

    const vista = proposals.find((p) => p.id === 'avista');
    const p24 = proposals.find((p) => p.id === 'entrada24');
    const p60 = proposals.find((p) => p.id === 'entrada60');
    expect(vista).toBeTruthy();
    expect(p24).toBeTruthy();
    expect(p60).toBeTruthy();

    expect(vista!.descontoPercent).toBe(8);
    expect(vista!.totalPago).toBeCloseTo(460000, 2);
    expect(p24!.parcelas).toBe(24);
    expect(p24!.jurosMensal).toBeCloseTo(0.009, 6);
    expect(p60!.parcelas).toBe(60);
    expect(p60!.jurosMensal).toBeCloseTo(0.012, 6);
    proposals.forEach((p) => expect(Number.isFinite(p.totalPago)).toBe(true));
    proposals.forEach((p) => expect(p.economiaVsMaiorTotal).toBeGreaterThanOrEqual(0));
  });
});
