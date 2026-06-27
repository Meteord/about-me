module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pixel: {
          bg: "#0f172a",
          panel: "#111827",
          panelAlt: "#1f2937",
          ink: "#e2e8f0",
          accent: "#22d3ee",
          accent2: "#f59e0b",
          success: "#22c55e",
          danger: "#ef4444",
          border: "#334155",
        },
      },
      fontFamily: {
        pixelHeading: ["\"Press Start 2P\"", "monospace"],
        pixelBody: ["\"VT323\"", "monospace"],
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(15, 23, 42, 0.9)",
        pixelSoft: "2px 2px 0 0 rgba(15, 23, 42, 0.75)",
      },
      borderRadius: {
        pixel: "2px",
      },
    },
  },
  plugins: [],
}
