import { useMemo } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RoomPage } from "./pages/RoomPage";
import { AdminPage } from "./pages/AdminPage";
import { generateRoomId } from "./utils/roomId";

/**
 * HomeRedirect
 *
 * Generates a unique room ID once on mount and immediately redirects the
 * user to /room/:id. No "home page" or "create room" button — zero clicks.
 *
 * useMemo ensures the ID is stable across re-renders within the same mount.
 */
function HomeRedirect() {
  const roomId = useMemo(() => generateRoomId(), []);
  return <Navigate to={`/room/${roomId}`} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Zero-click: instantly generate and redirect to a random room */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Room page: /room/:roomId */}
        <Route path="/room/:roomId" element={<RoomPage />} />

        {/* Admin dashboard (password-protected on both client and server) */}
        <Route path="/admin" element={<AdminPage />} />

        {/* 404 fallback — redirects home to get a fresh room */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
