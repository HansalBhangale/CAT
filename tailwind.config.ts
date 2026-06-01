import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0b1020",
        panel: "#121a2e",
        panel2: "#1a2440",
        line: "#26304d",
        brand: "#5b8cff",
        qa: "#34d399",
        varc: "#fbbf24",
        dilr: "#f472b6",
        lr: "#a78bfa",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
