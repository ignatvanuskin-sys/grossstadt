import type { Config } from "tailwindcss";

/**
 * Design system — "monographic project catalogue".
 * Palette is derived from the studio's own identity materials
 * (dark charcoal + brass, seen in the studio's printed album cover)
 * and from the tone of the published portfolio.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F2EE",
        surface: "#FFFFFF",
        ink: "#161616",
        muted: "#6B6B66",
        line: "#161616",
        night: "#141414",
        "night-2": "#1C1C1B",
        brass: "#8A6C3A",
        "brass-lit": "#D9BC85",
        "brass-dim": "#B49866",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1.2", letterSpacing: "0.12em" }],
        label: ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.1em" }],
        body: ["1.0625rem", { lineHeight: "1.6" }],
        lead: ["1.375rem", { lineHeight: "1.5" }],
        h3: ["clamp(1.25rem, 1rem + 1.1vw, 1.75rem)", { lineHeight: "1.25" }],
        h2: ["clamp(1.75rem, 1.2rem + 2.6vw, 3rem)", { lineHeight: "1.1" }],
        h1: ["clamp(2.25rem, 1.2rem + 5.4vw, 5.5rem)", { lineHeight: "1.02" }],
      },
      maxWidth: {
        shell: "1440px",
        prose: "68ch",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        rise: "rise 0.55s cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
