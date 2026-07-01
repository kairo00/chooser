import { useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerState, FingerState } from '@chooser/shared';
import { getPlayerColor } from '../utils/colors';
import { CountdownBar } from './CountdownBar';

interface Props {
  players: PlayerState[];
  fingers: FingerState[];
  myPlayerId: string | null;
  countdownActive: boolean;
  countdownDurationMs: number;
  roomId: string;
  onFingerDown: (x: number, y: number) => void;
  onFingerMove: (x: number, y: number) => void;
  onFingerUp: () => void;
}

/**
 * InteractiveCanvas
 *
 * Full-screen dark canvas — the main game surface.
 * Captures pointer + touch events and displays a neubrutalist circle
 * for every player with their finger currently down.
 */
export function InteractiveCanvas({
  players, fingers, myPlayerId,
  countdownActive, countdownDurationMs,
  roomId, onFingerDown, onFingerMove, onFingerUp,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const isHolding = useRef(false);

  const getCoords = useCallback((clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.round(clientX - rect.left),
      y: Math.round(clientY - rect.top),
    };
  }, []);

  /* ── Pointer (desktop) ─────────────────────────────────────────────────── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    areaRef.current?.setPointerCapture(e.pointerId);
    isHolding.current = true;
    const { x, y } = getCoords(e.clientX, e.clientY);
    onFingerDown(x, y);
  }, [getCoords, onFingerDown]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isHolding.current) return;
    const { x, y } = getCoords(e.clientX, e.clientY);
    onFingerMove(x, y);
  }, [getCoords, onFingerMove]);

  const handlePointerUp = useCallback(() => {
    if (!isHolding.current) return;
    isHolding.current = false;
    onFingerUp();
  }, [onFingerUp]);

  /* ── Touch (mobile) ────────────────────────────────────────────────────── */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = getCoords(t.clientX, t.clientY);
    onFingerDown(x, y);
  }, [getCoords, onFingerDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const { x, y } = getCoords(t.clientX, t.clientY);
    onFingerMove(x, y);
  }, [getCoords, onFingerMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    onFingerUp();
  }, [onFingerUp]);

  const activeFingers = fingers.filter((f) => f.isDown);
  const activeCount = activeFingers.length;

  return (
    <div
      ref={areaRef}
      className="bg-grid-ink w-screen h-screen relative overflow-hidden"
      style={{ touchAction: 'none', userSelect: 'none', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Countdown bar ──────────────────────────────────────────────────── */}
      <CountdownBar active={countdownActive} durationMs={countdownDurationMs} />

      {/* ── Instruction (idle state) ────────────────────────────────────────── */}
      <AnimatePresence>
        {activeCount === 0 && (
          <motion.div
            key="idle"
            className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {/* Pulsing ring */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-white/10" />
            </div>
            <p className="font-mono text-white/20 text-sm uppercase tracking-[0.3em]">
              Appuyez et maintenez
            </p>
            <p className="font-mono text-white/10 text-xs tracking-widest">
              il faut au moins 2 doigts pour tirer au sort
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Player circles ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeFingers.map((finger) => {
          const color = getPlayerColor(players, finger.playerId);
          const isMe = finger.playerId === myPlayerId;

          return (
            <motion.div
              key={finger.playerId}
              className="absolute pointer-events-none"
              style={{ left: finger.x, top: finger.y }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            >
              {/* Outer glow ring (my player = brighter) */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: 90,
                  height: 90,
                  top: -45,
                  left: -45,
                  backgroundColor: color,
                  opacity: isMe ? 0.25 : 0.12,
                  filter: 'blur(12px)',
                }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Main circle */}
              <div
                className="rounded-full border-[3px] border-black"
                style={{
                  width: 68,
                  height: 68,
                  marginLeft: -34,
                  marginTop: -34,
                  backgroundColor: color,
                  boxShadow: isMe ? `5px 5px 0px #000, 0 0 0 3px ${color}55` : '5px 5px 0px #000',
                  position: 'relative',
                }}
              >
                {/* "Me" inner ring */}
                {isMe && (
                  <div className="absolute inset-[6px] rounded-full border-2 border-black/30" />
                )}
              </div>

              {/* Name badge */}
              <div
                className="absolute font-mono font-bold text-[11px] uppercase tracking-wider bg-white border-[2px] border-black px-2.5 py-[3px] whitespace-nowrap"
                style={{
                  boxShadow: '3px 3px 0px #000',
                  left: '50%',
                  top: 14,
                  transform: 'translateX(-50%)',
                }}
              >
                {finger.firstName}
                {isMe && (
                  <span className="text-black/40 font-normal"> ◂</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* ── Players roster (top-right) ──────────────────────────────────────── */}
      <motion.div
        className="absolute top-8 right-5 flex flex-col gap-2 pointer-events-none"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div
          className="bg-white/5 border border-white/10 backdrop-blur-sm px-3 py-2 mb-1"
          style={{ borderLeft: '3px solid #FFD60A' }}
        >
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
            Salle #{roomId} · {players.length} joueur{players.length !== 1 ? 's' : ''}
          </span>
        </div>

        {players.map((player) => {
          const color = getPlayerColor(players, player.playerId);
          const isActive = activeFingers.some((f) => f.playerId === player.playerId);
          const isMe = player.playerId === myPlayerId;
          return (
            <div key={player.playerId} className="flex items-center gap-2.5">
              <div
                className="w-3 h-3 rounded-full border border-black flex-shrink-0 transition-opacity duration-300"
                style={{
                  backgroundColor: color,
                  opacity: isActive ? 1 : 0.3,
                  boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
                }}
              />
              <span
                className={`font-mono text-xs transition-opacity duration-300 ${isActive ? 'text-white' : 'text-white/30'}`}
              >
                {player.firstName}
                {isMe && <span className="text-white/30"> (moi)</span>}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* ── Active count badge (bottom-center) ─────────────────────────────── */}
      <AnimatePresence>
        {activeCount >= 2 && !countdownActive && (
          <motion.div
            className="absolute bottom-8 left-1/2 pointer-events-none"
            style={{ translateX: '-50%' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div
              className="bg-acid border-[3px] border-black font-mono font-bold text-black px-6 py-3 text-sm uppercase tracking-widest"
              style={{ boxShadow: '4px 4px 0px #000' }}
            >
              {activeCount} doigt{activeCount > 1 ? 's' : ''} détecté{activeCount > 1 ? 's' : ''} — tirage imminent
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
