import { useEffect, useRef, useState } from 'react';

export function useFitScale(pageW: number, pageH: number, padding = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(40, rect.width - padding * 2);
      const height = Math.max(40, rect.height - padding * 2);
      setScale(Math.max(0.05, Math.min(width / pageW, height / pageH)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pageW, pageH, padding]);

  return { ref, scale };
}
