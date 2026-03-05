import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SelectedLot } from './proposal-engine';

type SelectedLotContextValue = {
  selectedLot: SelectedLot | null;
  setSelectedLot: (lot: SelectedLot | null) => void;
};

const SelectedLotContext = createContext<SelectedLotContextValue | null>(null);

export function SelectedLotProvider({ children }: { children: ReactNode }) {
  const [selectedLot, setSelectedLot] = useState<SelectedLot | null>(null);
  const value = useMemo(() => ({ selectedLot, setSelectedLot }), [selectedLot]);
  return <SelectedLotContext.Provider value={value}>{children}</SelectedLotContext.Provider>;
}

export function useSelectedLot() {
  const ctx = useContext(SelectedLotContext);
  if (!ctx) throw new Error('useSelectedLot precisa estar dentro de SelectedLotProvider');
  return ctx;
}
