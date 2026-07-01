import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface Props {
  active: boolean;
  durationMs: number;
}

/**
 * CountdownBar
 *
 * Thick acid-yellow neubrutalist progress bar pinned to the top of the canvas.
 * Depletes from 100% → 0% over `durationMs` when `active` becomes true.
 * The MotionValue drives the DOM width directly — zero React re-renders.
 */
export function CountdownBar({ active, durationMs }: Props) {
  // 0–100 numeric progress value
  const progress = useMotionValue(100);
  // Convert to a CSS percentage string for use in style.width
  const widthStyle = useTransform(progress, (v) => `${v}%`);
  const controlRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    controlRef.current?.stop();

    if (active) {
      progress.set(100);
      controlRef.current = animate(progress, 0, {
        duration: durationMs / 1000,
        ease: 'linear',
      });
    } else {
      progress.set(100);
    }

    return () => {
      controlRef.current?.stop();
    };
  }, [active, durationMs, progress]);

  if (!active) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      {/* Track */}
      <div className="w-full h-[6px] bg-white/10 border-b border-black/20">
        {/* Animated fill — widthStyle is a MotionValue<string>, FM handles reactivity */}
        <motion.div className="h-full bg-acid" style={{ width: widthStyle }} />
      </div>

      {/* Floating label below bar */}
      <motion.div
        className="absolute top-[10px] left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div
          className="bg-acid border-[3px] border-black font-mono font-bold text-black text-[11px] px-3 py-[3px] uppercase tracking-[0.25em] whitespace-nowrap"
          style={{ boxShadow: '3px 3px 0px #000' }}
        >
          ⏳ Tirage en cours…
        </div>
      </motion.div>
    </div>
  );
}
