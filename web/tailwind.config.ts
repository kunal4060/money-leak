import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        page: "#f4f5f3",
        ink: "#141a16",
        ink2: "#3f4742",
        fog: "#6c7570",
        line: "#e1e6e0",
        linedark: "#c9d1c9",
        accent: {
          DEFAULT: "#0c7a55",
          deep: "#095c42",
          soft: "#e4efe9",
        },
        brick: {
          DEFAULT: "#b2402b",
          deep: "#8e3220",
          soft: "#f9ece7",
        },
        clay: {
          DEFAULT: "#a4681a",
          soft: "#f7efdf",
        },
        sagesoft: "#edf1ec",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
