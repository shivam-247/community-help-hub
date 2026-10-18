/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-neighbour)",
          "var(--font-hi)",
          "var(--font-gu)",
          "sans-serif",
        ],
      },
      borderRadius: { control: "8px", card: "16px" },
      boxShadow: { quiet: "0 1px 3px #00000008" },
      keyframes: {
        shimmer: { "0%, 100%": { opacity: "1" }, "50%": { opacity: ".55" } },
      },
      animation: { shimmer: "shimmer 150ms ease 2" },
    },
  },
  plugins: [],
};
