import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
  roomId: string;
  firstName: string;
  onReady: () => void;
}

/* ── Stagger ─────────────────────────────────────────────────────────────── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
} as const;

const item = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const, duration: 0.5 } },
} as const;

/**
 * RoomLinkScreen
 *
 * Intermediate screen shown after joining but before entering the game canvas.
 * Presents the shareable room URL prominently so players can invite friends.
 *
 * Layout (full-screen dark):
 *   ✓  Bienvenue, [Prénom] !
 *   ─── (acid divider)
 *   Invitez vos amis :
 *   [  url/room/xxxxx          COPIER  ]
 *   [  COMMENCER À JOUER →              ]
 */
export function RoomLinkScreen({ roomId, firstName, onReady }: Props) {
  const [copied, setCopied] = useState(false);
  const roomUrl = `${window.location.origin}/room/${roomId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback: select the text visually
      const el = document.getElementById('room-link-text');
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    }
  }, [roomUrl]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dot-dark flex items-center justify-center">

      {/* ── Decorative elements ──────────────────────────────────────────────── */}

      {/* Cyan accent block — top-left */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 200,
          height: 200,
          top: -60,
          left: -50,
          backgroundColor: '#00E5CC',
          border: '3px solid #000',
          transform: 'rotate(22deg)',
          opacity: 0.7,
          zIndex: 0,
        }}
      />

      {/* Bottom stripe */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 5, backgroundColor: '#00E5CC', borderTop: '2px solid #000', zIndex: 0 }}
      />

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-lg px-6"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* Check mark + greeting */}
        <motion.div variants={item} className="mb-6">
          <div
            className="inline-block font-mono text-xs uppercase tracking-widest px-3 py-1 mb-4"
            style={{
              backgroundColor: '#00E5CC',
              border: '2px solid #000',
              boxShadow: '3px 3px 0px #000',
              color: '#000',
            }}
          >
            ✓ Vous avez rejoint la salle
          </div>
          <h2
            className="font-dela text-light leading-none uppercase"
            style={{ fontSize: 'clamp(44px, 11vw, 72px)' }}
          >
            Bienvenue,<br />
            <span style={{ color: '#FFE500' }}>{firstName} !</span>
          </h2>
        </motion.div>

        {/* Acid divider */}
        <motion.div
          variants={item}
          className="mb-7"
          style={{ height: 4, backgroundColor: '#FFE500', border: '1px solid #000' }}
        />

        {/* Link section */}
        <motion.div variants={item} className="mb-5">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3"
            style={{ color: '#5A5A5A' }}
          >
            Partagez ce lien avec vos amis :
          </p>

          {/* Copyable URL row */}
          <div
            className="flex items-stretch"
            style={{
              border: '2px solid #2A2A2A',
              boxShadow: '4px 4px 0px #FFE500',
              backgroundColor: '#1C1C1C',
            }}
          >
            {/* URL text */}
            <div className="flex-1 px-4 py-3 overflow-hidden">
              <span
                id="room-link-text"
                className="font-mono text-sm select-all"
                style={{ color: '#EDEDED', whiteSpace: 'nowrap' }}
              >
                {roomUrl}
              </span>
            </div>

            {/* Copy button */}
            <motion.button
              onClick={handleCopy}
              className="flex-shrink-0 px-4 py-3 font-mono text-xs font-bold uppercase tracking-widest border-l-2 transition-colors duration-150"
              style={{
                backgroundColor: copied ? '#00E5CC' : '#FFE500',
                borderColor: '#000',
                color: '#000',
                borderLeft: '2px solid #2A2A2A',
              }}
              whileTap={{ scale: 0.96 }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </motion.button>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item}>
          <motion.button
            onClick={onReady}
            className="btn-acid w-full font-dela text-black text-2xl py-5 uppercase tracking-widest"
            whileTap={{ x: 4, y: 4, boxShadow: '2px 2px 0px #000' }}
            transition={{ duration: 0.04 }}
          >
            Commencer à jouer →
          </motion.button>
        </motion.div>

        {/* Subtle hint */}
        <motion.p
          variants={item}
          className="font-mono text-xs mt-4 text-center"
          style={{ color: '#5A5A5A' }}
        >
          Il faut au moins 2 joueurs avec les doigts posés pour tirer au sort.
        </motion.p>
      </motion.div>
    </div>
  );
}
