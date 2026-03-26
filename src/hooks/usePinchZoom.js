// usePinchZoom.js — 두 손가락 핀치 줌

import { useState, useCallback, useRef } from 'react';

export function usePinchZoom(minScale = 0.5, maxScale = 2.0) {
  const [scale, setScale] = useState(1);
  const initialDist = useRef(null);
  const initialScale = useRef(1);

  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDist.current = Math.hypot(dx, dy);
      initialScale.current = scale;
    }
  }, [scale]);

  const onTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && initialDist.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / initialDist.current;
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale.current * ratio));
      setScale(newScale);
    }
  }, [minScale, maxScale]);

  const onTouchEnd = useCallback(() => {
    initialDist.current = null;
  }, []);

  return { scale, onTouchStart, onTouchMove, onTouchEnd };
}
