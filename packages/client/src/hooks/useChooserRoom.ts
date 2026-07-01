import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ClientEvents,
  ServerEvents,
  PlayerState,
  FingerState,
  WinnerSelectedPayload,
} from "@chooser/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface ChooserRoomState {
  // Connection
  isConnected: boolean;
  myPlayerId: string | null;
  hasJoined: boolean;

  // Room data
  players: PlayerState[];
  fingers: FingerState[];

  // Countdown
  countdownActive: boolean;
  countdownDurationMs: number;

  // Winner
  winner: WinnerSelectedPayload | null;

  // Errors
  lastError: string | null;
}

export interface ChooserRoomActions {
  joinRoom: (firstName: string) => void;
  fingerDown: (x: number, y: number) => void;
  fingerMove: (x: number, y: number) => void;
  fingerUp: () => void;
  adminSetWeight: (playerId: string, weight: number) => void;
  dismissWinner: () => void;
}

export type UseChooserRoomReturn = ChooserRoomState & ChooserRoomActions;

// ── Hook ──────────────────────────────────────────────────────────────────────

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

/**
 * useChooserRoom
 *
 * Headless custom hook encapsulating ALL Socket.io complexity.
 * The consuming component receives pure state + action functions —
 * no knowledge of sockets, events, or serialisation formats.
 *
 * @param roomId  The room identifier (from the URL, e.g. /room/123)
 */
export function useChooserRoom(roomId: string): UseChooserRoomReturn {
  const socketRef = useRef<AppSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [fingers, setFingers] = useState<FingerState[]>([]);
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdownDurationMs, setCountdownDurationMs] = useState(3000);
  const [winner, setWinner] = useState<WinnerSelectedPayload | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ── Socket lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) return;

    const socket: AppSocket = io(SERVER_URL, {
      query: { roomId },
      autoConnect: true,
      reconnectionAttempts: 5,
    }) as AppSocket;

    socketRef.current = socket;

    // Store our own socket ID once connected
    socket.on("connect", () => {
      setIsConnected(true);
      setMyPlayerId(socket.id ?? null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setHasJoined(false);
    });

    // ── Server events ─────────────────────────────────────────────────────────

    socket.on(ServerEvents.ROOM_STATE, (state) => {
      setPlayers(state.players);
      setFingers(state.fingers);
      setCountdownActive(state.countdownActive);
      setHasJoined(true);
    });

    socket.on(ServerEvents.PLAYER_JOINED, (player) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.playerId === player.playerId)) return prev;
        return [...prev, player];
      });
    });

    socket.on(ServerEvents.PLAYER_LEFT, ({ playerId }) => {
      setPlayers((prev) => prev.filter((p) => p.playerId !== playerId));
      setFingers((prev) => prev.filter((f) => f.playerId !== playerId));
    });

    socket.on(ServerEvents.FINGER_UPDATED, (finger) => {
      setFingers((prev) => {
        const idx = prev.findIndex((f) => f.playerId === finger.playerId);
        if (idx === -1) return [...prev, finger];
        const next = [...prev];
        next[idx] = finger;
        return next;
      });
    });

    socket.on(ServerEvents.COUNTDOWN_STARTED, ({ duration }) => {
      setCountdownActive(true);
      setCountdownDurationMs(duration);
      setWinner(null); // clear previous winner when new countdown starts
    });

    socket.on(ServerEvents.COUNTDOWN_CANCELLED, () => {
      setCountdownActive(false);
    });

    socket.on(ServerEvents.WINNER_SELECTED, (payload) => {
      setCountdownActive(false);
      setWinner(payload);
    });

    socket.on(ServerEvents.ERROR, ({ message }) => {
      setLastError(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const joinRoom = useCallback((firstName: string) => {
    socketRef.current?.emit(ClientEvents.JOIN_ROOM, { firstName });
    setLastError(null);
  }, []);

  const fingerDown = useCallback((x: number, y: number) => {
    socketRef.current?.emit(ClientEvents.FINGER_DOWN, { x, y });
  }, []);

  const fingerMove = useCallback((x: number, y: number) => {
    socketRef.current?.emit(ClientEvents.FINGER_MOVE, { x, y });
  }, []);

  const fingerUp = useCallback(() => {
    socketRef.current?.emit(ClientEvents.FINGER_UP);
  }, []);

  const adminSetWeight = useCallback((playerId: string, weight: number) => {
    socketRef.current?.emit(ClientEvents.ADMIN_SET_WEIGHT, { playerId, weight });
  }, []);

  const dismissWinner = useCallback(() => {
    setWinner(null);
  }, []);

  return {
    // State
    isConnected,
    myPlayerId,
    hasJoined,
    players,
    fingers,
    countdownActive,
    countdownDurationMs,
    winner,
    lastError,
    // Actions
    joinRoom,
    fingerDown,
    fingerMove,
    fingerUp,
    adminSetWeight,
    dismissWinner,
  };
}
