/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "Menlo", "monospace"],
      },
      colors: {
        ink: {
          50: "#fafaf7",
          100: "#f4f4ee",
          200: "#e8e8df",
          300: "#cfcfc1",
          400: "#9a9a8a",
          500: "#6b6b5e",
          600: "#444439",
          700: "#2a2a23",
          800: "#1a1a16",
          900: "#0e0e0b",
        },
        risk: {
          low: "#10b981",
          moderate: "#f59e0b",
          high: "#ef4444",
          critical: "#7c2d12",
        },
        accent: "#0891b2",
      },
      boxShadow: {
        panel:
          "0 1px 0 0 rgba(15,23,42,0.05), 0 1px 3px 0 rgba(15,23,42,0.04), 0 8px 16px -8px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
};
