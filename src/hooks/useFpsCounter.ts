import { useEffect, useRef, useState } from 'react';

/**
 * Real-time frames-per-second readout for the current browser tab, sampled
 * via requestAnimationFrame. Reflects actual render performance of this
 * page (not a video feed) — used by the Broadcast Telemetry Bar as an
 * honest "is this HUD running smoothly" indicator.
 */
export function useFpsCounter(): number {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastSampleRef = useRef(performance.now());
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    function tick(now: number) {
      frameCountRef.current += 1;
      const elapsed = now - lastSampleRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastSampleRef.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return fps;
}
