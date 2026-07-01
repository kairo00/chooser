import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useChooserRoom } from '../hooks/useChooserRoom';
import { JoinScreen } from '../components/JoinScreen';
import { RoomLinkScreen } from '../components/RoomLinkScreen';
import { InteractiveCanvas } from '../components/InteractiveCanvas';
import { WinnerOverlay } from '../components/WinnerOverlay';

/**
 * RoomPage — Three-state orchestrator
 *
 *   hasJoined = false               → <JoinScreen>      (dark, full-screen)
 *   hasJoined = true, isReady=false → <RoomLinkScreen>  (share link first)
 *   hasJoined = true, isReady=true  → <InteractiveCanvas> + optional <WinnerOverlay>
 *
 * All state transitions use AnimatePresence mode="wait" for clean crossfades.
 * The hook owns all socket + server state — this component is pure routing.
 */
export function RoomPage() {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const [isReady, setIsReady] = useState(false);

  const {
    isConnected,
    myPlayerId,
    hasJoined,
    players,
    fingers,
    countdownActive,
    countdownDurationMs,
    winner,
    lastError,
    joinRoom,
    fingerDown,
    fingerMove,
    fingerUp,
    dismissWinner,
  } = useChooserRoom(roomId);

  // Derive first name from the players list once we have a socket ID
  const myPlayer = players.find((p) => p.playerId === myPlayerId);
  const firstName = myPlayer?.firstName ?? '';

  // Which screen key to show for AnimatePresence
  const screenKey = !hasJoined ? 'join' : !isReady ? 'link' : 'canvas';

  return (
    <div className="w-screen h-screen overflow-hidden">
      <AnimatePresence mode="wait">
        {screenKey === 'join' && (
          <motion.div
            key="join"
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.35, ease: 'easeIn' } }}
            transition={{ duration: 0.3 }}
          >
            <JoinScreen
              onJoin={joinRoom}
              isConnected={isConnected}
              lastError={lastError}
              roomId={roomId}
            />
          </motion.div>
        )}

        {screenKey === 'link' && (
          <motion.div
            key="link"
            className="w-full h-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.3, ease: 'easeIn' } }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <RoomLinkScreen
              roomId={roomId}
              firstName={firstName}
              onReady={() => setIsReady(true)}
            />
          </motion.div>
        )}

        {screenKey === 'canvas' && (
          <motion.div
            key="canvas"
            className="w-full h-full"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <InteractiveCanvas
              players={players}
              fingers={fingers}
              myPlayerId={myPlayerId}
              countdownActive={countdownActive}
              countdownDurationMs={countdownDurationMs}
              roomId={roomId}
              onFingerDown={fingerDown}
              onFingerMove={fingerMove}
              onFingerUp={fingerUp}
            />

            {/* Winner overlay — rendered on top of canvas, not replacing it */}
            <AnimatePresence>
              {winner && (
                <WinnerOverlay
                  key={winner.playerId + winner.firstName}
                  winner={winner}
                  players={players}
                  fingers={fingers}
                  onDismiss={() => { dismissWinner(); setIsReady(false); }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
