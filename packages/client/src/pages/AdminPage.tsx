import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayerState } from '@chooser/shared';

const API_BASE = import.meta.env.VITE_SERVER_URL ? import.meta.env.VITE_SERVER_URL.replace(/\/$/, '') : '';

/* ── Types ───────────────────────────────────────────────────────────────── */

interface RoomData {
  roomId: string;
  playerCount: number;
  players: PlayerState[];
  countdownActive: boolean;
}

/* ── Animations ──────────────────────────────────────────────────────────── */

const fadeUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { ease: 'easeOut' as const, duration: 0.5 } },
} as const;

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
} as const;

/* ── Sub-components ──────────────────────────────────────────────────────── */

/** A single player row with inline weight editor */
function PlayerRow({
  player,
  roomId,
  password,
  onWeightUpdated,
}: {
  player: PlayerState;
  roomId: string;
  password: string;
  onWeightUpdated: () => void;
}) {
  const [weight, setWeight] = useState(String(player.weight));
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleApply = useCallback(async () => {
    const parsed = parseFloat(weight);
    if (isNaN(parsed) || parsed < 0) return;

    setStatus('loading');
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/rooms/${roomId}/players/${player.playerId}/weight`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({ weight: parsed }),
        }
      );

      if (!res.ok) throw new Error('Erreur serveur');
      setStatus('ok');
      onWeightUpdated();
    } catch {
      setStatus('error');
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setStatus('idle'), 1800);
    }
  }, [weight, roomId, player.playerId, password, onWeightUpdated]);

  // Sync weight field if player.weight changes after server refresh
  useEffect(() => {
    setWeight(String(player.weight));
  }, [player.weight]);

  const statusColor = { idle: '#5A5A5A', loading: '#FFE500', ok: '#00E5CC', error: '#FF2D78' }[status];
  const statusLabel = { idle: '', loading: '…', ok: '✓', error: '✗' }[status];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid #1C1C1C' }}
    >
      {/* Colored dot */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: '#FFE500', border: '1px solid #000' }}
      />

      {/* Name */}
      <span className="font-syne font-semibold text-light flex-1 truncate">
        {player.firstName}
      </span>

      {/* Weight label */}
      <span className="font-mono text-xs" style={{ color: '#5A5A5A', width: 56 }}>
        poids: {player.weight}
      </span>

      {/* Weight input */}
      <input
        type="number"
        min={0}
        step={0.5}
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        className="input-dark font-mono text-sm text-center"
        style={{ width: 64, padding: '4px 6px' }}
      />

      {/* Apply button */}
      <motion.button
        onClick={handleApply}
        disabled={status === 'loading'}
        className="btn-magenta font-mono text-xs font-bold uppercase tracking-widest px-4 py-2 flex-shrink-0"
        whileTap={status !== 'loading' ? { x: 3, y: 3, boxShadow: '2px 2px 0px #000' } : {}}
      >
        {status === 'loading' ? '…' : 'Appliquer'}
      </motion.button>

      {/* Status indicator */}
      <span className="font-mono text-sm font-bold w-4 text-center" style={{ color: statusColor }}>
        {statusLabel}
      </span>
    </div>
  );
}

/** A single room card */
function RoomCard({
  room,
  password,
  onRefresh,
}: {
  room: RoomData;
  password: string;
  onRefresh: () => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="card-dark-magenta mb-6"
      style={{ boxShadow: '5px 5px 0px #FF2D78' }}
    >
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '2px solid #1C1C1C' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono font-bold text-xs uppercase tracking-widest px-2 py-1"
            style={{ backgroundColor: '#FF2D78', color: '#000', border: '1px solid #000' }}
          >
            Salle
          </span>
          <span className="font-mono font-bold text-light tracking-widest">
            {room.roomId}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {room.countdownActive && (
            <span
              className="font-mono text-xs uppercase tracking-widest px-2 py-1 animate-pulse"
              style={{ color: '#FFE500', border: '1px solid #FFE500' }}
            >
              ⏳ tirage
            </span>
          )}
          <span className="font-mono text-xs" style={{ color: '#5A5A5A' }}>
            {room.playerCount} joueur{room.playerCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Players */}
      {room.players.length === 0 ? (
        <div className="px-4 py-5 font-mono text-xs text-center" style={{ color: '#5A5A5A' }}>
          Aucun joueur dans cette salle.
        </div>
      ) : (
        room.players.map((player) => (
          <PlayerRow
            key={player.playerId}
            player={player}
            roomId={room.roomId}
            password={password}
            onWeightUpdated={onRefresh}
          />
        ))
      )}
    </motion.div>
  );
}

/* ── Locked screen ───────────────────────────────────────────────────────── */

function LockedScreen({ onUnlock }: { onUnlock: (pw: string) => Promise<boolean> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    const ok = await onUnlock(password);
    setLoading(false);
    if (!ok) setError('Mot de passe incorrect. Réessayez.');
  }, [password, onUnlock]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dot-dark flex items-center justify-center">

      {/* ── Decorative geometry ────────────────────────────────────────────── */}

      {/* Large diagonal block — top-right in magenta */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 480,
          height: 480,
          top: -160,
          right: -120,
          backgroundColor: '#FF2D78',
          border: '3px solid #000',
          transform: 'rotate(-38deg)',
          opacity: 0.8,
          zIndex: 0,
        }}
      />

      {/* Bottom stripe */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: 5, backgroundColor: '#FF2D78', borderTop: '2px solid #000', zIndex: 0 }}
      />

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative z-10 w-full max-w-md px-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* "ADMIN" badge */}
        <motion.div variants={fadeUp} className="mb-6">
          <div
            className="inline-block font-mono text-xs uppercase tracking-widest px-3 py-1 mb-4"
            style={{
              backgroundColor: 'transparent',
              border: '2px solid #FF2D78',
              color: '#FF2D78',
              boxShadow: '3px 3px 0px #FF2D78',
            }}
          >
            Zone Admin
          </div>

          {/* Main heading */}
          <h1
            className="font-dela text-light leading-none uppercase"
            style={{
              fontSize: 'clamp(72px, 18vw, 128px)',
              letterSpacing: '-0.02em',
              textShadow: '5px 5px 0px rgba(255, 45, 120, 0.25)',
            }}
          >
            ACCÈS<br />
            <span style={{ color: '#FF2D78' }}>RESTREINT</span>
          </h1>
        </motion.div>

        {/* Magenta divider */}
        <motion.div
          variants={fadeUp}
          className="mb-7"
          style={{ height: 4, backgroundColor: '#FF2D78', border: '1px solid #000' }}
        />

        {/* Password label */}
        <motion.label
          variants={fadeUp}
          htmlFor="admin-password"
          className="block font-mono text-[10px] uppercase tracking-[0.3em] font-bold mb-2"
          style={{ color: '#5A5A5A' }}
        >
          Mot de passe administrateur
        </motion.label>

        {/* Password input */}
        <motion.input
          variants={fadeUp}
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="••••••••••"
          autoFocus
          autoComplete="current-password"
          className="input-dark w-full px-5 py-4 text-xl mb-5 block"
        />

        {/* CTA */}
        <motion.div variants={fadeUp}>
          <motion.button
            onClick={handleSubmit}
            disabled={loading || !password}
            className="btn-magenta w-full font-dela text-black text-2xl py-5 uppercase tracking-widest"
            whileTap={!loading && password ? { x: 4, y: 4, boxShadow: '2px 2px 0px #000' } : {}}
            transition={{ duration: 0.04 }}
          >
            {loading ? 'Vérification…' : 'Déverrouiller →'}
          </motion.button>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
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
              ⚠ {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ── Dashboard screen ────────────────────────────────────────────────────── */

function DashboardScreen({
  password,
  onLock,
}: {
  password: string;
  onLock: () => void;
}) {
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/rooms`, {
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = (await res.json()) as { rooms: RoomData[] };
      setRooms(data.rooms);
      setError('');
    } catch {
      setError('Impossible de charger les données.');
    } finally {
      setLoading(false);
    }
  }, [password]);

  // Initial load + polling every 5 s
  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  return (
    <div
      className="w-screen h-screen overflow-hidden flex flex-col"
      style={{ backgroundColor: '#080808' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          backgroundColor: '#111111',
          borderBottom: '2px solid #2A2A2A',
          borderLeft: '4px solid #FF2D78',
        }}
      >
        <div className="flex items-center gap-4">
          <h1 className="font-dela text-light text-2xl uppercase tracking-widest">
            Admin
          </h1>
          <span
            className="font-mono text-xs uppercase tracking-widest px-2 py-1"
            style={{ backgroundColor: '#FF2D78', color: '#000', border: '1px solid #000' }}
          >
            Chooser
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <motion.button
            onClick={fetchRooms}
            className="font-mono text-xs uppercase tracking-widest px-3 py-2"
            style={{
              backgroundColor: '#1C1C1C',
              border: '2px solid #2A2A2A',
              color: '#5A5A5A',
            }}
            whileTap={{ opacity: 0.7 }}
          >
            ↻ Actualiser
          </motion.button>

          {/* Lock */}
          <motion.button
            onClick={onLock}
            className="font-mono text-xs uppercase tracking-widest px-3 py-2"
            style={{
              backgroundColor: '#1C1C1C',
              border: '2px solid #FF2D78',
              color: '#FF2D78',
              boxShadow: '3px 3px 0px #FF2D78',
            }}
            whileTap={{ x: 3, y: 3, boxShadow: '1px 1px 0px #FF2D78' }}
          >
            ⊘ Verrouiller
          </motion.button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">

        {/* Stats banner */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="font-mono text-xs uppercase tracking-widest px-3 py-2"
            style={{
              backgroundColor: '#1C1C1C',
              border: '2px solid #2A2A2A',
              color: '#EDEDED',
            }}
          >
            {rooms.length} salle{rooms.length !== 1 ? 's' : ''} active{rooms.length !== 1 ? 's' : ''}
          </div>
          <div
            className="font-mono text-xs uppercase tracking-widest px-3 py-2"
            style={{
              backgroundColor: '#1C1C1C',
              border: '2px solid #2A2A2A',
              color: '#EDEDED',
            }}
          >
            {rooms.reduce((acc, r) => acc + r.playerCount, 0)} joueur{rooms.reduce((acc, r) => acc + r.playerCount, 0) !== 1 ? 's' : ''} connecté{rooms.reduce((acc, r) => acc + r.playerCount, 0) !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Acid divider */}
        <div
          className="mb-6"
          style={{ height: 3, backgroundColor: '#FF2D78', border: '1px solid #000' }}
        />

        {/* Loading state */}
        {loading && (
          <div className="font-mono text-xs uppercase tracking-widest animate-pulse text-center py-16" style={{ color: '#5A5A5A' }}>
            Chargement…
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            className="font-mono text-sm px-4 py-3"
            style={{
              border: '2px solid #FF2D78',
              color: '#FF2D78',
              backgroundColor: '#1C1C1C',
            }}
          >
            ⚠ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-20">
            <p
              className="font-dela text-4xl uppercase mb-3"
              style={{ color: '#2A2A2A' }}
            >
              Aucune salle
            </p>
            <p className="font-mono text-xs uppercase tracking-widest" style={{ color: '#5A5A5A' }}>
              Attendez que des joueurs rejoignent une salle.
            </p>
          </div>
        )}

        {/* Rooms */}
        {!loading && !error && rooms.length > 0 && (
          <motion.div variants={stagger} initial="hidden" animate="visible">
            {rooms.map((room) => (
              <RoomCard
                key={room.roomId}
                room={room}
                password={password}
                onRefresh={fetchRooms}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── AdminPage ───────────────────────────────────────────────────────────── */

/**
 * AdminPage
 *
 * State 1 — Locked: Full-screen dark password prompt (no database, no JWT).
 *   Validates by attempting GET /api/admin/rooms with the entered password.
 *   Server returns 401 on wrong password — client stays locked.
 *
 * State 2 — Unlocked: Dashboard with live room list, per-player weight controls.
 *   All API calls include the x-admin-password header.
 *   Auto-refreshes every 5 seconds.
 */
export function AdminPage() {
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  const handleUnlock = useCallback(async (pw: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/rooms`, {
        headers: { 'x-admin-password': pw },
      });
      if (res.ok) {
        setAdminPassword(pw);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const handleLock = useCallback(() => {
    setAdminPassword(null);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {adminPassword === null ? (
        <motion.div
          key="locked"
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.25 } }}
          transition={{ duration: 0.3 }}
        >
          <LockedScreen onUnlock={handleUnlock} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          className="w-full h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <DashboardScreen password={adminPassword} onLock={handleLock} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
