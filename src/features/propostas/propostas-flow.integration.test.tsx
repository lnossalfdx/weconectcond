import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ProposalComparison } from './proposal-ui';
import { SelectedLotProvider, useSelectedLot } from './selected-lot-store';

function Harness() {
  const { selectedLot, setSelectedLot } = useSelectedLot();
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          setSelectedLot({
            id: '42',
            nome: 'Lote 42',
            area: 280,
            preco: 400000,
            status: 'Disponível',
          })
        }
      >
        Selecionar lote teste
      </button>
      <ProposalComparison selectedLot={selectedLot} onUseProposal={() => {}} />
    </div>
  );
}

describe('propostas flow integration', () => {
  it('exibe estado vazio e depois mostra 3 propostas ao selecionar lote', async () => {
    const user = userEvent.setup();
    render(
      <SelectedLotProvider>
        <Harness />
      </SelectedLotProvider>,
    );

    expect(screen.getByText(/Nenhum lote selecionado/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Selecionar lote teste/i }));

    expect(screen.getByText(/À vista \(8% desconto\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Entrada 20% \+ 24x/i)).toBeInTheDocument();
    expect(screen.getByText(/Entrada 10% \+ 60x/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Total pago:/i).length).toBeGreaterThan(0);
  });
});
