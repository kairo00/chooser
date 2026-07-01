import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onJoin: (firstName: string) => void;
  isConnected: boolean;
  lastError: string | null;
  roomId: string;
}

/* ── Stagger animation ───────────────────────────────────────────────────── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
} as const;

const item = {
  hidden:   { opacity: 0, y: 24 },
  visible:  { opacity: 1, y: 0, transition: { ease: 'easeOut' as const, duration: 0.55 } },
} as const;

/**
 * JoinScreen — Dark Neubrutalism Edition
 *
 * Full-screen join form. Zero CSS on the canvas —
 * styled exclusively via Tailwind and inline styles.
 *
 * Design language:
 * - Near-black (#080808) dot-grid background
 * - Dela Gothic One for the CHOOSER brand title (oversized, overflows grid)
 * - Syne Mono for labels and status
 * - Electric yellow (#FFE500) as the sole accent
 * - Hot magenta (#FF2D78) for decorative geometry
 * - 3px black borders + 6px black shadow on the CTA button
 */
export function JoinScreen({ onJoin, isConnected, lastError, roomId }: Props) {
  const [name, setName] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed && isConnected) onJoin(trimmed);
  }, [name, isConnected, onJoin]);

  const canSubmit = isConnected && name.trim().length > 0;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dot-dark flex items-center justify-center">

      {/* ── Decorative geometry ─────────────────────────────────────────────── */}

      {/* Magenta diagonal block — top-right, goes off screen */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 420,
          height: 420,
          top: -140,
          right: -100,
          backgroundColor: '#FF2D78',
          border: '3px solid #000',
          transform: 'rotate(-42deg)',
          zIndex: 0,
        }}
      />

      {/* Smaller yellow block — bottom-left accent */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 120,
          height: 120,
          bottom: -30,
          left: -20,
          backgroundColor: '#FFE500',
          border: '3px solid #000',
          transform: 'rotate(18deg)',
          zIndex: 0,
        }}
      />

      {/* Bottom acid stripe */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 5, backgroundColor: '#FFE500', borderTop: '2px solid #000', zIndex: 0 }}
      />

      {/* ── Room tag (top-right) ─────────────────────────────────────────────── */}
      <div
        className="absolute top-5 right-5 z-10 flex items-center gap-2 px-3 py-1.5"
        style={{
          backgroundColor: '#111111',
          border: '2px solid #2A2A2A',
          borderLeft: '3px solid #FFE500',
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isConnected ? '#00E5CC' : '#FF2D78',
            boxShadow: isConnected ? '0 0 6px #00E5CC' : '0 0 6px #FF2D78',
          }}
        />
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: '#5A5A5A' }}>
          Salle #{roomId}
        </span>
      </div>

      {/* ── Main form card ───────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-md px-6"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Brand title — oversized, bleeds left deliberately */}
        <motion.div variants={item} className="mb-6 select-none" style={{ marginLeft: -4 }}>
          <h1
            className="font-dela leading-none text-light uppercase"
            style={{
              fontSize: 'clamp(96px, 22vw, 160px)',
              letterSpacing: '-0.02em',
              // Raw text-shadow for depth — no gradient, no glow, just hard offset
              textShadow: '5px 5px 0px rgba(255,229,0,0.2)',
            }}
          >
            CHOO<br />SER
          </h1>
          <p
            className="font-mono text-xs uppercase tracking-[0.35em] mt-3 ml-1"
            style={{ color: '#5A5A5A' }}
          >
            Le destin au bout du doigt
          </p>
        </motion.div>

        {/* Acid divider */}
        <motion.div
          variants={item}
          className="mb-7"
          style={{ height: 4, backgroundColor: '#FFE500', border: '1px solid #000' }}
        />

        {/* Label */}
        <motion.label
          variants={item}
          htmlFor="firstName"
          className="block font-mono text-[10px] uppercase tracking-[0.3em] font-bold mb-2"
          style={{ color: '#5A5A5A' }}
        >
          Votre prénom
        </motion.label>

        {/* Input */}
        <motion.input
          variants={item}
          id="firstName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Alice…"
          maxLength={20}
          autoFocus
          disabled={!isConnected}
          className="input-dark w-full px-5 py-4 text-xl mb-5 block"
          style={{ fontSize: 20 }}
        />

        {/* CTA — yellow button, hard black shadow, press animation */}
        <motion.div variants={item}>
          <motion.button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-acid w-full font-dela text-black text-2xl py-5 uppercase tracking-widest"
            whileTap={canSubmit ? { x: 4, y: 4, boxShadow: '2px 2px 0px #000' } : {}}
            transition={{ duration: 0.04 }}
          >
            Rejoindre →
          </motion.button>
        </motion.div>

        {/* Connection indicator */}
        <motion.div
          variants={item}
          className="flex items-center gap-2 mt-5 font-mono text-xs"
          style={{ color: '#5A5A5A' }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isConnected ? '#00E5CC' : '#FF2D78',
              animation: isConnected ? 'none' : 'pulse 1.4s ease-in-out infinite',
            }}
          />
          {isConnected ? 'Serveur connecté' : 'Connexion au serveur…'}
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {lastError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 px-4 py-3 font-mono text-sm"
              style={{
                backgroundColor: '#1C1C1C',
                border: '2px solid #FF2D78',
                boxShadow: '4px 4px 0px #FF2D78',
                color: '#FF2D78',
              }}
            >
              ⚠ {lastError}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
