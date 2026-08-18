/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Same DBiz.ai brand tokens as the GlowUp LMS, for visual
        // consistency between the two sibling apps.
        ink: '#111111',
        paper: '#FAFAFA',
        accent: '#F07B2F',
        'accent-hover': '#E06B1F',
        navy: '#0D1B3E',
        'navy-light': '#1A2D5A',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(13, 27, 62, 0.04)',
        md: '0 12px 32px rgba(13, 27, 62, 0.10)',
        lg: '0 18px 50px rgba(7, 15, 34, 0.18)',
      },
    },
  },
  plugins: [],
};
