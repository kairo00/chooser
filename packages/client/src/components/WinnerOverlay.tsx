import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerState, FingerState, WinnerSelectedPayload } from '@chooser/shared';
import { getPlayerColor } from '../utils/colors';

interface Props {
  winner: WinnerSelectedPayload;
  players: PlayerState[];
  fingers: FingerState[];
  onDismiss: () => void;
}

const CIRCLE_RADIUS = 34; // px, matches InteractiveCanvas circle radius

/**
 * Calculates the scale factor needed to expand a circle centered at (cx, cy)
 * with initial radius `r` until it fully covers the entire viewport.
 */
function getExplosionScale(cx: number, cy: number, r: number): number {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const maxDist = Math.max(
    Math.sqrt(cx ** 2 + cy ** 2),
    Math.sqrt((W - cx) ** 2 + cy ** 2),
    Math.sqrt(cx ** 2 + (H - cy) ** 2),
    Math.sqrt((W - cx) ** 2 + (H - cy) ** 2)
  );
  return Math.ceil((maxDist / r) * 1.15); // 15% overshoot for safety
}

/**
 * WinnerOverlay
 *
 * The climax of the app. When a winner is chosen the server emits
 * `winner_selected`. This component:
 *
 * 1. Expands the winner's circle from its (x,y) finger origin to fill the
 *    entire screen in the player's assigned colour (Framer Motion scale).
 * 2. Staggered-reveals the "GAGNANT !" label and winner's name in giant type.
 * 3. Shows a "Nouvelle partie" dismiss button.
 *
 * Rendered as a fixed overlay on top of InteractiveCanvas — no modal, no portal.
 */
export function WinnerOverlay({ winner, players, fingers, onDismiss }: Props) {
  const [textVisible, setTextVisible] = useState(false);

  // Find winner's last known finger position
  const winnerFinger = fingers.find((f) => f.playerId === winner.playerId);
  const cx = winnerFinger?.x ?? window.innerWidth / 2;
  const cy = winnerFinger?.y ?? window.innerHeight / 2;

  const winnerColor = getPlayerColor(players, winner.playerId);
  const scale = getExplosionScale(cx, cy, CIRCLE_RADIUS);

  // Reveal text after the circle explosion completes
  useEffect(() => {
    const t = setTimeout(() => setTextVisible(true), 750);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = useCallback(() => {
    setTextVisible(false);
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* ── Exploding circle ─────────────────────────────────────────────────── */}
      <motion.div
        className="absolute rounded-full border-[3px] border-black"
        style={{
          width: CIRCLE_RADIUS * 2,
          height: CIRCLE_RADIUS * 2,
          left: cx - CIRCLE_RADIUS,
          top: cy - CIRCLE_RADIUS,
          backgroundColor: winnerColor,
          transformOrigin: 'center',
          boxShadow: '5px 5px 0px #000',
        }}
        initial={{ scale: 1 }}
        animate={{ scale }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* ── Text layer (pointer-events restored for button) ─────────────────── */}
      <AnimatePresence>
        {textVisible && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-auto"
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* "GAGNANT !" label */}
            <motion.p
              className="font-mono font-bold uppercase tracking-[0.4em] text-sm text-black/60"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.0, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              🏆 GAGNANT !
            </motion.p>

            {/* Winner name */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.18, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2
                className="font-dela leading-none text-black uppercase text-center"
                style={{
                  fontSize: 'clamp(72px, 18vw, 160px)',
                  textShadow: '6px 8px 0px rgba(0,0,0,0.15)',
                }}
              >
                {winner.firstName}
              </h2>
            </motion.div>

            {/* Thick divider */}
            <motion.div
              className="bg-black"
              style={{ height: 5 }}
              initial={{ width: 0 }}
              animate={{ width: 'clamp(160px, 40vw, 320px)' }}
              transition={{ delay: 0.38, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />

            {/* Dismiss button */}
            <motion.button
              className="btn-brutal bg-white font-mono font-bold text-black text-lg px-10 py-4 uppercase tracking-widest pointer-events-auto"
              onClick={handleDismiss}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              whileTap={{ x: 4, y: 4, boxShadow: '2px 2px 0px #000' }}
            >
              Nouvelle partie →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
