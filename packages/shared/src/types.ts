// ─────────────────────────────────────────────────────────────────────────────
// @chooser/shared — Interface contract between frontend and backend
// ─────────────────────────────────────────────────────────────────────────────

// ── Socket.io event names ────────────────────────────────────────────────────

export const ClientEvents = {
  JOIN_ROOM: "join_room",
  FINGER_DOWN: "finger_down",
  FINGER_MOVE: "finger_move",
  FINGER_UP: "finger_up",
  ADMIN_SET_WEIGHT: "admin_set_weight",
} as const;

export const ServerEvents = {
  ROOM_STATE: "room_state",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  FINGER_UPDATED: "finger_updated",
  COUNTDOWN_STARTED: "countdown_started",
  COUNTDOWN_CANCELLED: "countdown_cancelled",
  WINNER_SELECTED: "winner_selected",
  ERROR: "error",
} as const;

export type ClientEventName = (typeof ClientEvents)[keyof typeof ClientEvents];
export type ServerEventName = (typeof ServerEvents)[keyof typeof ServerEvents];

// ── Domain models ────────────────────────────────────────────────────────────

export interface PlayerState {
  playerId: string; // socket.id
  firstName: string;
  weight: number; // default 1, used for weighted draw
  joinedAt: number; // Date.now()
}

export interface FingerState {
  playerId: string;
  firstName: string;
  isDown: boolean;
  x: number;
  y: number;
  updatedAt: number;
}

export interface RoomState {
  roomId: string;
  players: PlayerState[];
  fingers: FingerState[];
  countdownActive: boolean;
  countdownRemainingMs: number | null;
}

// ── Client → Server event payloads ──────────────────────────────────────────

export interface JoinRoomPayload {
  firstName: string;
}

export interface FingerDownPayload {
  x: number;
  y: number;
}

export interface FingerMovePayload {
  x: number;
  y: number;
}

// finger_up has no payload

export interface AdminSetWeightPayload {
  playerId: string;
  weight: number;
  /** Must match ADMIN_PASSWORD on the server — required for privileged socket events */
  adminPassword?: string;
}


// ── Server → Client event payloads ──────────────────────────────────────────

export interface WinnerSelectedPayload {
  playerId: string;
  firstName: string;
}

export interface ErrorPayload {
  message: string;
}

export interface CountdownStartedPayload {
  duration: number; // milliseconds (3000)
}

// ── Socket.io typed interface maps ───────────────────────────────────────────

export interface ServerToClientEvents {
  [ServerEvents.ROOM_STATE]: (state: RoomState) => void;
  [ServerEvents.PLAYER_JOINED]: (player: PlayerState) => void;
  [ServerEvents.PLAYER_LEFT]: (payload: { playerId: string }) => void;
  [ServerEvents.FINGER_UPDATED]: (finger: FingerState) => void;
  [ServerEvents.COUNTDOWN_STARTED]: (payload: CountdownStartedPayload) => void;
  [ServerEvents.COUNTDOWN_CANCELLED]: () => void;
  [ServerEvents.WINNER_SELECTED]: (payload: WinnerSelectedPayload) => void;
  [ServerEvents.ERROR]: (payload: ErrorPayload) => void;
}

export interface ClientToServerEvents {
  [ClientEvents.JOIN_ROOM]: (payload: JoinRoomPayload) => void;
  [ClientEvents.FINGER_DOWN]: (payload: FingerDownPayload) => void;
  [ClientEvents.FINGER_MOVE]: (payload: FingerMovePayload) => void;
  [ClientEvents.FINGER_UP]: () => void;
  [ClientEvents.ADMIN_SET_WEIGHT]: (payload: AdminSetWeightPayload) => void;
}

// ── Inter-server events (Socket.io adapter, not used yet) ────────────────────
export type InterServerEvents = Record<string, never>;

// ── Per-socket data attached by the server ────────────────────────────────────
export interface SocketData {
  roomId: string;
  firstName: string;
}
