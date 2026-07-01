/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        dela: ['"Dela Gothic One"', 'sans-serif'],
        syne: ['Syne', 'sans-serif'],
        mono: ['"Syne Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // ── Neon accents ─────────────────────────────────────────────
        acid: '#FFE500',       // electric yellow — primary CTA
        magenta: '#FF2D78',    // hot magenta — admin / secondary
        cyan: '#00E5CC',       // neon cyan — tertiary / success
        // ── Dark surfaces ────────────────────────────────────────────
        ink: '#080808',        // near-black background
        surface: '#111111',    // card surface
        surface2: '#1C1C1C',   // elevated / input surface
        border: '#2A2A2A',     // subtle dark border
        // ── Text ─────────────────────────────────────────────────────
        light: '#EDEDED',      // primary text on dark
        muted: '#5A5A5A',      // secondary text
        // ── Legacy (used by InteractiveCanvas / WinnerOverlay) ───────
        cream: '#FAF8F0',
      },
      boxShadow: {
        // Black shadows — for neon/yellow elements on dark surfaces
        brutal:    '6px 6px 0px #000',
        'brutal-sm': '4px 4px 0px #000',
        'brutal-xs': '2px 2px 0px #000',
        // Neon shadows — for dark cards on dark backgrounds
        'neon-acid':    '5px 5px 0px #FFE500',
        'neon-magenta': '5px 5px 0px #FF2D78',
        'neon-cyan':    '5px 5px 0px #00E5CC',
      },
    },
  },
  plugins: [],
};
