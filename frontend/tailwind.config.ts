import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'primary-dark': '#000000',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: '#6B7280',
        'secondary-foreground': 'var(--secondary-foreground)',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        // Semantic tokens required by components/ui/*.tsx (Popover, Select,
        // DropdownMenu, Tooltip, Dialog, Command, ContextMenu, HoverCard,
        // Card, Badge, Button, Input, etc.). These were previously
        // undefined, so any `bg-popover`, `text-popover-foreground`,
        // `text-muted-foreground`, etc. class generated no CSS at all —
        // the root cause of faded/invisible text in every floating
        // overlay across the app.
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      backgroundColor: {
        default: 'var(--bg-default)',
      },
    },
  },
  plugins: [],
};

export default config;
