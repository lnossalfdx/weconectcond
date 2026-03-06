import { AppRouter } from '@/app/router';
import { SelectedLotProvider } from '@/features/propostas/selected-lot-store';
import { MobileDeviceController } from '@/components/layout/mobile-device-controller';

export default function App() {
  return (
    <SelectedLotProvider>
      <MobileDeviceController />
      <AppRouter />
    </SelectedLotProvider>
  );
}
