/**
 * Player color palette — vibrant, neubrutalism-friendly.
 * Each player is assigned a color deterministically based on
 * their position in the players array (first join → first color).
 */
export const PLAYER_COLORS: readonly string[] = [
  '#FF6B6B', // coral red
  '#48C9B0', // emerald teal
  '#F7DC6F', // sunshine yellow
  '#5DADE2', // sky blue
  '#F39C12', // amber orange
  '#A29BFE', // soft lavender
  '#FD79A8', // hot pink
  '#55EFC4', // mint green
] as const;

/** Returns the background colour to use for this player */
export function getPlayerColor(
  players: { playerId: string }[],
  playerId: string
): string {
  const idx = players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return PLAYER_COLORS[0];
  return PLAYER_COLORS[idx % PLAYER_COLORS.length];
}

/** Contrasting text colour (always black for these palettes) */
export function getPlayerTextColor(_bgColor: string): string {
  return '#000000';
}
