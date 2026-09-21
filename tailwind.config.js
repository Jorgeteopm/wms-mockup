/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
        // Brand blue, anchored to the WMS logo's navy (900 = #102234, sampled from the mark)
        // and 600 built out as the primary interactive shade — same role `red` played before
        // the MIC -> WMS rebrand. Semantic colors (status pills, destructive actions) are
        // untouched and still use Tailwind's stock red/amber/emerald.
        brand: {
          50:  '#eef4f9',
          100: '#dce9f2',
          200: '#b9d3e6',
          300: '#8fb8d6',
          400: '#5f98c0',
          500: '#3f7ba7',
          600: '#285f8c',
          700: '#1f4a6e',
          800: '#17374f',
          900: '#102234',
          950: '#0a1622',
        },
      },
    }
  },
  plugins: []
}
