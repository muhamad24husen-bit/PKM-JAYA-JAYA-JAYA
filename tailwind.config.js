/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        nirwana: {
          background: "#f6f7f8",
          surface: "#ffffff",
          surfaceMuted: "#f1f3f4",
          border: "#e4e7eb",
          text: "#14181b",
          muted: "#6b7280",
          accent: "#0f766e",
          accentSoft: "#ccfbf1",
          normal: "#16a34a",
          normalSoft: "#f0fdf4",
          waspada: "#d97706",
          waspadaSoft: "#fffbeb",
          hipoksia: "#dc2626",
          hipoksiaSoft: "#fef2f2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-geist)", "Geist", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "0.75rem",
      },
    },
  },
  plugins: [],
};
