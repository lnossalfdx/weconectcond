import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

const getIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
};

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const onChange = () => setIsMobile(getIsMobile());
    onChange();
    window.addEventListener('resize', onChange);
    return () => window.removeEventListener('resize', onChange);
  }, []);

  return isMobile;
}
