import { useEffect } from 'react';
import { useIsMobile } from '@/lib/use-is-mobile';

export function MobileDeviceController() {
  const isMobile = useIsMobile();

  useEffect(() => {
    document.documentElement.dataset.device = isMobile ? 'mobile' : 'desktop';
    return () => {
      delete document.documentElement.dataset.device;
    };
  }, [isMobile]);

  return null;
}
