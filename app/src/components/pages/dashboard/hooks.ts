import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Count-up hook — tweens 0 → target on mount and whenever `target` changes. */
export function useCountUp(target: number, duration = 0.8): number {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const controls = animate(prev.current, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    prev.current = target;
    return () => controls.stop();
  }, [target, duration]);
  return val;
}

/** Ticking clock — re-renders every `intervalMs`. Returns ms elapsed since mount. */
export function useElapsed(intervalMs = 1000): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = window.setInterval(() => setElapsed(Date.now() - start), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return elapsed;
}
