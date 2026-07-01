/**
 * ChooserTimer
 *
 * Manages per-room countdown timers. Responsible for:
 * - Starting a 3-second timer for a room
 * - Cancelling the timer if finger events interrupt it
 * - Resetting the timer (cancel + restart) on mid-countdown interruption
 *
 * The timer callback is provided by the caller (socketHandlers), keeping
 * this module free of Socket.io dependencies.
 */

const COUNTDOWN_DURATION_MS = 3000;

export class ChooserTimer {
  private timers = new Map<string, NodeJS.Timeout>();

  get countdownDuration(): number {
    return COUNTDOWN_DURATION_MS;
  }

  isActive(roomId: string): boolean {
    return this.timers.has(roomId);
  }

  /**
   * Start a countdown for the room. If one is already active, does nothing.
   * Use `resetIfActive` to restart an existing timer.
   */
  start(roomId: string, onElapsed: (roomId: string) => void): void {
    if (this.timers.has(roomId)) return;

    const handle = setTimeout(() => {
      this.timers.delete(roomId);
      onElapsed(roomId);
    }, COUNTDOWN_DURATION_MS);

    this.timers.set(roomId, handle);
  }

  /**
   * Cancel the active countdown for the room (if any).
   */
  cancel(roomId: string): void {
    const handle = this.timers.get(roomId);
    if (handle !== undefined) {
      clearTimeout(handle);
      this.timers.delete(roomId);
    }
  }

  /**
   * If a timer is active, cancel it and restart it (3s reset).
   * If no timer is active, start a new one.
   * Returns whether a reset actually happened (vs a fresh start).
   */
  resetIfActive(
    roomId: string,
    onElapsed: (roomId: string) => void
  ): { wasReset: boolean } {
    const wasActive = this.isActive(roomId);
    this.cancel(roomId);
    this.start(roomId, onElapsed);
    return { wasReset: wasActive };
  }

  /**
   * Clean up all timers (e.g. on server shutdown).
   */
  clearAll(): void {
    for (const [roomId, handle] of this.timers) {
      clearTimeout(handle);
      this.timers.delete(roomId);
    }
  }
}
