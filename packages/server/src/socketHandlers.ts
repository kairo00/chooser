import { Server, Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  ClientEvents,
  ServerEvents,
  JoinRoomPayload,
  FingerDownPayload,
  FingerMovePayload,
  AdminSetWeightPayload,
} from "@chooser/shared";
import { RoomManager } from "./RoomManager";
import { ChooserTimer } from "./ChooserTimer";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const MIN_FINGERS_FOR_COUNTDOWN = 2;

/**
 * Evaluates whether to start, reset, or cancel the countdown based on
 * the current number of active fingers in the room.
 */
function evaluateTimer(
  io: AppServer,
  roomId: string,
  roomManager: RoomManager,
  timer: ChooserTimer
): void {
  const activeCount = roomManager.getActiveFingers(roomId).length;

  if (activeCount >= MIN_FINGERS_FOR_COUNTDOWN) {
    // Enough fingers — start or reset the countdown
    const { wasReset } = timer.resetIfActive(roomId, (rid) =>
      onTimerElapsed(io, rid, roomManager, timer)
    );

    if (!wasReset) {
      // Freshly started — notify clients
      io.to(roomId).emit(ServerEvents.COUNTDOWN_STARTED, {
        duration: timer.countdownDuration,
      });
    } else {
      // Reset — cancel + restart notification
      io.to(roomId).emit(ServerEvents.COUNTDOWN_CANCELLED);
      io.to(roomId).emit(ServerEvents.COUNTDOWN_STARTED, {
        duration: timer.countdownDuration,
      });
    }
  } else {
    // Not enough fingers — cancel if running
    if (timer.isActive(roomId)) {
      timer.cancel(roomId);
      io.to(roomId).emit(ServerEvents.COUNTDOWN_CANCELLED);
    }
  }
}

/**
 * Called when the countdown elapses without interruption.
 * Performs the weighted draw and broadcasts the winner.
 */
function onTimerElapsed(
  io: AppServer,
  roomId: string,
  roomManager: RoomManager,
  timer: ChooserTimer
): void {
  const winner = roomManager.weightedDraw(roomId);
  if (!winner) return;

  io.to(roomId).emit(ServerEvents.WINNER_SELECTED, {
    playerId: winner.playerId,
    firstName: winner.firstName,
  });
}

/**
 * Registers all Socket.io event handlers on a single socket.
 * Called once per new connection from the main entry point.
 *
 * @param adminPassword - The server-side admin password for validating
 *                        privileged socket events (admin_set_weight).
 */
export function registerSocketHandlers(
  io: AppServer,
  socket: AppSocket,
  roomManager: RoomManager,
  timer: ChooserTimer,
  adminPassword: string
): void {
  // ── join_room ─────────────────────────────────────────────────────────────

  socket.on(ClientEvents.JOIN_ROOM, (payload: JoinRoomPayload) => {
    const { firstName } = payload;

    if (!firstName || firstName.trim().length === 0) {
      socket.emit(ServerEvents.ERROR, { message: "Prénom invalide." });
      return;
    }

    // If the socket already joined a room, leave it first
    if (socket.data.roomId) {
      const prevRoomId = socket.data.roomId;
      socket.leave(prevRoomId);
      roomManager.removePlayer(prevRoomId, socket.id);
      io.to(prevRoomId).emit(ServerEvents.PLAYER_LEFT, {
        playerId: socket.id,
      });
    }

    const roomId = socket.data.roomId ?? extractRoomId(socket);

    socket.data.roomId = roomId;
    socket.data.firstName = firstName.trim();

    socket.join(roomId);

    const player = roomManager.addPlayer(roomId, socket.id, firstName.trim());

    // Send current room state to the joining player
    const state = roomManager.getRoomState(roomId, timer.isActive(roomId));
    socket.emit(ServerEvents.ROOM_STATE, state);

    // Notify all others in the room
    socket.to(roomId).emit(ServerEvents.PLAYER_JOINED, player);
  });

  // ── finger_down ───────────────────────────────────────────────────────────

  socket.on(ClientEvents.FINGER_DOWN, (payload: FingerDownPayload) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const finger = roomManager.updateFinger(roomId, socket.id, {
      isDown: true,
      x: payload.x,
      y: payload.y,
    });
    if (!finger) return;

    io.to(roomId).emit(ServerEvents.FINGER_UPDATED, finger);
    evaluateTimer(io, roomId, roomManager, timer);
  });

  // ── finger_move ───────────────────────────────────────────────────────────

  socket.on(ClientEvents.FINGER_MOVE, (payload: FingerMovePayload) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const finger = roomManager.updateFinger(roomId, socket.id, {
      x: payload.x,
      y: payload.y,
    });
    if (!finger) return;

    io.to(roomId).emit(ServerEvents.FINGER_UPDATED, finger);
    // No timer evaluation on move — position changes don't affect countdown
  });

  // ── finger_up ─────────────────────────────────────────────────────────────

  socket.on(ClientEvents.FINGER_UP, () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const finger = roomManager.updateFinger(roomId, socket.id, {
      isDown: false,
    });
    if (!finger) return;

    io.to(roomId).emit(ServerEvents.FINGER_UPDATED, finger);
    evaluateTimer(io, roomId, roomManager, timer);
  });

  // ── admin_set_weight ──────────────────────────────────────────────────────

  socket.on(
    ClientEvents.ADMIN_SET_WEIGHT,
    (payload: AdminSetWeightPayload) => {
      // Validate admin password before any privileged action
      if (!payload.adminPassword || payload.adminPassword !== adminPassword) {
        socket.emit(ServerEvents.ERROR, {
          message: "Mot de passe administrateur invalide.",
        });
        return;
      }

      const roomId = socket.data.roomId;
      if (!roomId) return;

      const success = roomManager.setWeight(
        roomId,
        payload.playerId,
        payload.weight
      );

      if (!success) {
        socket.emit(ServerEvents.ERROR, {
          message: `Joueur introuvable : ${payload.playerId}`,
        });
        return;
      }

      // Reflect updated state to all in room
      const state = roomManager.getRoomState(roomId, timer.isActive(roomId));
      io.to(roomId).emit(ServerEvents.ROOM_STATE, state);
    }
  );

  // ── disconnect ────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const { roomEmpty } = roomManager.removePlayer(roomId, socket.id);

    io.to(roomId).emit(ServerEvents.PLAYER_LEFT, { playerId: socket.id });

    if (roomEmpty) {
      timer.cancel(roomId);
    } else {
      evaluateTimer(io, roomId, roomManager, timer);
    }
  });
}

/**
 * Extracts the room ID from the socket's handshake query.
 * Clients must pass `?roomId=<id>` in the connection URL.
 */
function extractRoomId(socket: AppSocket): string {
  const raw = socket.handshake.query.roomId;
  if (typeof raw === "string" && raw.length > 0) return raw;
  return `room_${Date.now()}`;
}
