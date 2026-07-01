import { PlayerState } from "@chooser/shared";

/**
 * Pure function — weighted random selection.
 *
 * Each player has a `weight` (default 1). The probability of being chosen is:
 *   P(player) = weight / sum(all weights)
 *
 * Algorithm: build a cumulative weight array, pick a random value in [0, total),
 * find the first player whose cumulative threshold exceeds the random value.
 */
export function weightedDraw(players: PlayerState[]): PlayerState | null {
  if (players.length === 0) return null;

  const totalWeight = players.reduce((sum, p) => sum + p.weight, 0);

  if (totalWeight <= 0) {
    // Fallback: uniform random if all weights are 0 or negative
    return players[Math.floor(Math.random() * players.length)];
  }

  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (const player of players) {
    cumulative += player.weight;
    if (roll < cumulative) {
      return player;
    }
  }

  // Should never reach here, but return last player as safety
  return players[players.length - 1];
}
