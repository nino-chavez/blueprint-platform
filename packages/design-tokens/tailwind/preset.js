/**
 * @blueprint/design-tokens — Tailwind preset
 *
 * Consume from a Tailwind config:
 *
 *   import bcsPreset from '@blueprint/design-tokens/tailwind';
 *
 *   export default {
 *     presets: [bcsPreset],
 *     content: [
 *       './src/**\/*.{js,ts,jsx,tsx,svelte}',
 *       './node_modules/@blueprint/ui/dist/**\/*.{js,mjs}',
 *     ],
 *   };
 *
 * Color values reference CSS variables defined in @blueprint/design-tokens/css.
 * Always import that stylesheet at the root of any consuming app/surface:
 *
 *   import '@blueprint/design-tokens/css';
 */

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT:    'oklch(var(--blue-brand-lch) / <alpha-value>)',
          background: 'oklch(var(--blue-brand-background-lch) / <alpha-value>)',
          foreground: 'oklch(var(--blue-brand-foreground-lch) / <alpha-value>)',
        },
        success: {
          DEFAULT:    'oklch(var(--blue-success-lch) / <alpha-value>)',
          background: 'oklch(var(--blue-success-background-lch) / <alpha-value>)',
          foreground: 'oklch(var(--blue-success-foreground-lch) / <alpha-value>)',
        },
        error: {
          DEFAULT:    'oklch(var(--blue-error-lch) / <alpha-value>)',
          background: 'oklch(var(--blue-error-background-lch) / <alpha-value>)',
          foreground: 'oklch(var(--blue-error-foreground-lch) / <alpha-value>)',
        },
        warning: {
          DEFAULT:    'oklch(var(--blue-warning-lch) / <alpha-value>)',
          background: 'oklch(var(--blue-warning-background-lch) / <alpha-value>)',
          foreground: 'oklch(var(--blue-warning-foreground-lch) / <alpha-value>)',
        },
        info: {
          DEFAULT:    'oklch(var(--blue-info-lch) / <alpha-value>)',
          background: 'oklch(var(--blue-info-background-lch) / <alpha-value>)',
          foreground: 'oklch(var(--blue-info-foreground-lch) / <alpha-value>)',
        },
        background: 'oklch(var(--blue-background-lch) / <alpha-value>)',
        foreground: 'oklch(var(--blue-foreground-lch) / <alpha-value>)',
        contrast: {
          100: 'oklch(var(--blue-contrast-100-lch) / <alpha-value>)',
          200: 'oklch(var(--blue-contrast-200-lch) / <alpha-value>)',
          300: 'oklch(var(--blue-contrast-300-lch) / <alpha-value>)',
          400: 'oklch(var(--blue-contrast-400-lch) / <alpha-value>)',
          500: 'oklch(var(--blue-contrast-500-lch) / <alpha-value>)',
        },
      },
      fontFamily: {
        heading: 'var(--blue-font-heading)',
        body:    'var(--blue-font-body)',
        mono:    'var(--blue-font-mono)',
      },
      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1.125rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem',    letterSpacing: '-0.015em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.5rem',   { lineHeight: '2.75rem', letterSpacing: '-0.022em' }],
        '5xl': ['3rem',     { lineHeight: '3.25rem', letterSpacing: '-0.025em' }],
        '6xl': ['3.75rem',  { lineHeight: '4rem',    letterSpacing: '-0.028em' }],
        '7xl': ['4.5rem',   { lineHeight: '1',       letterSpacing: '-0.032em' }],
        '8xl': ['6rem',     { lineHeight: '1',       letterSpacing: '-0.035em' }],
      },
      borderRadius: {
        xs:  '0.25rem',
        sm:  '0.375rem',
        md:  '0.5rem',
        lg:  '0.75rem',
        xl:  '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        sm: 'var(--blue-shadow-sm)',
        md: 'var(--blue-shadow-md)',
        lg: 'var(--blue-shadow-lg)',
        xl: 'var(--blue-shadow-xl)',
      },
      transitionDuration: {
        instant:    '100ms',
        fast:       '150ms',
        normal:     '200ms',
        slow:       '300ms',
        deliberate: '500ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        decel:    'cubic-bezier(0, 0, 0.2, 1)',
        accel:    'cubic-bezier(0.4, 0, 1, 1)',
        spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
};
