import { useEffect, useState } from 'react';

export function useIsSmallScreen(threshold = 600) {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const check = () => setIsSmall(Math.min(window.innerWidth, window.innerHeight) < threshold);

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [threshold]);

  return isSmall;
}
