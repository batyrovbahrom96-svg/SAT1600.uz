import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f7f9fc",
        brand: "#1d4ed8",
        mint: "#12b981",
        warning: "#eab308"
      }
    }
  },
  plugins: []
};

export default config;
