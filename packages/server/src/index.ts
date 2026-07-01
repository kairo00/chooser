import express, { Request, Response, NextFunction } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@chooser/shared";
import { RoomManager } from "./RoomManager";
import { ChooserTimer } from "./ChooserTimer";
import { registerSocketHandlers } from "./socketHandlers";
import { ADMIN_PASSWORD, PORT, CLIENT_ORIGIN } from "./config";

// ── App setup ─────────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

// ── Shared state (singletons) ─────────────────────────────────────────────────

const roomManager = new RoomManager();
const timer = new ChooserTimer();

// ── Socket.io connection handler ──────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSocketHandlers(io, socket, roomManager, timer, ADMIN_PASSWORD);
});

// ── Admin middleware ───────────────────────────────────────────────────────────

/**
 * Validates the x-admin-password header.
 * Applied to all /api/admin routes.
 */
function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const provided = req.headers["x-admin-password"];
  if (!provided || provided !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Mot de passe administrateur invalide." });
    return;
  }
  next();
}

// ── Admin REST API ────────────────────────────────────────────────────────────

app.use("/api/admin", adminMiddleware);

/**
 * GET /api/admin/rooms
 * Returns all active rooms with their players and finger states.
 */
app.get("/api/admin/rooms", (_req: Request, res: Response) => {
  const rooms = roomManager.getAllRooms().map((room) => ({
    roomId: room.roomId,
    playerCount: room.players.size,
    players: Array.from(room.players.values()),
    fingers: Array.from(room.fingers.values()),
    countdownActive: timer.isActive(room.roomId),
  }));
  res.json({ rooms });
});

/**
 * PATCH /api/admin/rooms/:roomId/players/:playerId/weight
 * Body: { weight: number }
 * Sets the weighted draw weight for a specific player.
 */
app.patch(
  "/api/admin/rooms/:roomId/players/:playerId/weight",
  (req: Request, res: Response) => {
    const { roomId, playerId } = req.params;
    const { weight } = req.body as { weight?: unknown };

    if (typeof weight !== "number" || isNaN(weight) || weight < 0) {
      res.status(400).json({ error: "weight doit être un nombre >= 0." });
      return;
    }

    const success = roomManager.setWeight(roomId, playerId, weight);
    if (!success) {
      res.status(404).json({ error: "Joueur ou salle introuvable." });
      return;
    }

    res.json({ ok: true, playerId, weight });
  }
);

// ── Health check ──────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`🚀 Chooser server running on http://localhost:${PORT}`);
  console.log(`   CORS origin: ${CLIENT_ORIGIN}`);
  console.log(`   Admin password: ${ADMIN_PASSWORD === "chooser2025" ? "default (chooser2025)" : "*** (custom)"}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  timer.clearAll();
  httpServer.close(() => process.exit(0));
});
