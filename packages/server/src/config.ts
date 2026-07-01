import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env files in standard locations
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

/**
 * Server configuration — single source of truth for env-driven settings.
 * Import from here everywhere instead of reading process.env directly.
 */

/** Admin password — set ADMIN_PASSWORD env var in production */
export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? "chooser2025";

export const PORT = parseInt(process.env.PORT ?? "3001", 10);

export const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
