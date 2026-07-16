'use client';
import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';

export function useSessionTimer() {
  const { hasStarted, isPaused, tickElapsed } = useSessionStore();
  const lastTickRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasStarted || isPaused) {
      lastTickRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current !== null) {
        const delta = (now - lastTickRef.current) / 1000;
        // Clamp delta to avoid huge jumps if tab was backgrounded
        tickElapsed(Math.min(delta, 1));
      }
      lastTickRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTickRef.current = null;
    };
  }, [hasStarted, isPaused, tickElapsed]);
}
