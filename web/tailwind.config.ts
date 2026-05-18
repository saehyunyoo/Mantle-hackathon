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
        ink: "#06060c",
        card: "#0e0e18",
        panel: "#13131f",
        line: "#22223a",
        neon: "#7cffb2",
        hot: "#ff3d8b",
        cyber: "#5ed3ff",
        gold: "#ffc857",
        mute: "#7a7a92",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
