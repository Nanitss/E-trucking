/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        // Primary Brand Colors (Rich Blue)
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6", // Main Brand Blue
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // Secondary/Accent (Keeping Gold/Amber for alerts/highlights if needed, or mapping to a complementary blue/gray)
        secondary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
        },
        // Custom Sidebar Colors (Deep Blue/Slate for that modern "Dark Sidebar" look)
        sidebar: {
          bg: "#0f172a", // Dark Slate Blue (Background)
          hover: "#1e293b", // Slightly Lighter (Hover)
          active: "#334155", // Active Item Background
          text: "#94a3b8", // Muted Text
          "text-active": "#f8fafc", // Active Text
          border: "#1e293b", // Border color
        },
        // Backgrounds
        background: {
          DEFAULT: "#f4f6f8", // Light Gray/Blueish for main content area
          paper: "#ffffff",
        },
        // Semantic Colors
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
        },
        info: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 5px rgba(0, 0, 0, 0.05)",
        "card-hover": "0 10px 30px rgba(0, 0, 0, 0.1)",
        sidebar: "4px 0 24px rgba(0,0,0,0.1)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
