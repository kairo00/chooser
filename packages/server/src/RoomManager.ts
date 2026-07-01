import { PlayerState, FingerState, RoomState } from "@chooser/shared";
import { weightedDraw } from "./weightedDraw";

interface RoomData {
  roomId: string;
  players: Map<string, PlayerState>; // keyed by socketId
  fingers: Map<string, FingerState>; // keyed by socketId
}

/**
 * RoomManager
 *
 * In-memory store for all active rooms and their state.
 * Single source of truth for players, fingers, and weights.
 * No Socket.io dependency — pure data management.
 */
export class RoomManager {
  private rooms = new Map<string, RoomData>();

  // ── Room lifecycle ──────────────────────────────────────────────────────────

  getOrCreateRoom(roomId: string): RoomData {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        roomId,
        players: new Map(),
        fingers: new Map(),
      });
    }
    return this.rooms.get(roomId)!;
  }

  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): RoomData[] {
    return Array.from(this.rooms.values());
  }

  private cleanupIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room && room.players.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  // ── Player management ───────────────────────────────────────────────────────

  addPlayer(
    roomId: string,
    socketId: string,
    firstName: string
  ): PlayerState {
    const room = this.getOrCreateRoom(roomId);
    const player: PlayerState = {
      playerId: socketId,
      firstName,
      weight: 1,
      joinedAt: Date.now(),
    };
    room.players.set(socketId, player);
    return player;
  }

  removePlayer(
    roomId: string,
    socketId: string
  ): { removedPlayer: PlayerState | null; roomEmpty: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return { removedPlayer: null, roomEmpty: true };

    const player = room.players.get(socketId) ?? null;
    room.players.delete(socketId);
    room.fingers.delete(socketId);

    this.cleanupIfEmpty(roomId);

    return {
      removedPlayer: player,
      roomEmpty: room.players.size === 0,
    };
  }

  getPlayer(roomId: string, socketId: string): PlayerState | undefined {
    return this.rooms.get(roomId)?.players.get(socketId);
  }

  setWeight(roomId: string, socketId: string, weight: number): boolean {
    const player = this.getPlayer(roomId, socketId);
    if (!player) return false;
    player.weight = Math.max(0, weight); // weight must be non-negative
    return true;
  }

  // ── Finger management ───────────────────────────────────────────────────────

  updateFinger(
    roomId: string,
    socketId: string,
    data: Partial<Pick<FingerState, "isDown" | "x" | "y">>
  ): FingerState | null {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(socketId);
    if (!room || !player) return null;

    const existing = room.fingers.get(socketId);
    const finger: FingerState = {
      playerId: socketId,
      firstName: player.firstName,
      isDown: data.isDown ?? existing?.isDown ?? false,
      x: data.x ?? existing?.x ?? 0,
      y: data.y ?? existing?.y ?? 0,
      updatedAt: Date.now(),
    };

    room.fingers.set(socketId, finger);
    return finger;
  }

  getActiveFingers(roomId: string): FingerState[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.fingers.values()).filter((f) => f.isDown);
  }

  // ── Serialization ────────────────────────────────────────────────────────────

  getRoomState(roomId: string, countdownActive: boolean): RoomState {
    const room = this.getOrCreateRoom(roomId);
    return {
      roomId,
      players: Array.from(room.players.values()),
      fingers: Array.from(room.fingers.values()),
      countdownActive,
      countdownRemainingMs: null, // not tracked at this granularity
    };
  }

  // ── Weighted draw ────────────────────────────────────────────────────────────

  /**
   * Performs the weighted draw among players who have their finger down.
   * Falls back to all players if no active fingers exist.
   */
  weightedDraw(roomId: string): PlayerState | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const activeFingers = this.getActiveFingers(roomId);
    const eligiblePlayerIds =
      activeFingers.length > 0
        ? new Set(activeFingers.map((f) => f.playerId))
        : null;

    const eligible = Array.from(room.players.values()).filter(
      (p) => eligiblePlayerIds === null || eligiblePlayerIds.has(p.playerId)
    );

    return weightedDraw(eligible);
  }
}
