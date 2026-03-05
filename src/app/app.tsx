import { AppRouter } from '@/app/router';
import { SelectedLotProvider } from '@/features/propostas/selected-lot-store';

export default function App() {
  return (
    <SelectedLotProvider>
      <AppRouter />
    </SelectedLotProvider>
  );
}
