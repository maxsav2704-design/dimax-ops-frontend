import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['"Rubik"', '"Noto Sans Hebrew"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        display: ['"Rubik"', '"Noto Sans Hebrew"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      fontSize: {
        "11": ["var(--dmx-text-11)", { lineHeight: "1.5" }],
        "12": ["var(--dmx-text-12)", { lineHeight: "1.5" }],
        "13": ["var(--dmx-text-13)", { lineHeight: "1.5" }],
        "14": ["var(--dmx-text-14)", { lineHeight: "1.5" }],
        "16": ["var(--dmx-text-16)", { lineHeight: "1.5" }],
        "18": ["var(--dmx-text-18)", { lineHeight: "1.35" }],
        "20": ["var(--dmx-text-20)", { lineHeight: "1.3" }],
        "22": ["var(--dmx-text-22)", { lineHeight: "1.25" }],
        "24": ["var(--dmx-text-24)", { lineHeight: "1.2" }],
      },
      fontWeight: {
        regular: "var(--dmx-weight-regular)",
        medium: "var(--dmx-weight-medium)",
        semibold: "var(--dmx-weight-semibold)",
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "var(--dmx-border-strong)",
          subtle: "var(--dmx-border-subtle)",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        canvas: "var(--dmx-bg-canvas)",
        surface: {
          DEFAULT: "var(--dmx-bg-surface)",
          subtle: "var(--dmx-bg-surface-subtle)",
          sunken: "var(--dmx-bg-surface-sunken)",
        },
        text: {
          DEFAULT: "var(--dmx-text)",
          secondary: "var(--dmx-text-secondary)",
          tertiary: "var(--dmx-text-tertiary)",
          inverse: "var(--dmx-text-inverse)",
        },
        link: {
          DEFAULT: "var(--dmx-link)",
          hover: "var(--dmx-link-hover)",
          press: "var(--dmx-link-press)",
          tint: "var(--dmx-link-tint)",
        },
        kpi: {
          yellow: "var(--dmx-kpi-yellow)",
          orange: "var(--dmx-kpi-orange)",
          red: "var(--dmx-kpi-red)",
          green: "var(--dmx-kpi-green)",
          blue: "var(--dmx-kpi-blue)",
        },
        status: {
          ok: {
            bg: "var(--dmx-status-ok-bg)",
            fg: "var(--dmx-status-ok-fg)",
            border: "var(--dmx-status-ok-border)",
          },
          problem: {
            bg: "var(--dmx-status-problem-bg)",
            fg: "var(--dmx-status-problem-fg)",
            border: "var(--dmx-status-problem-border)",
          },
          warning: {
            bg: "var(--dmx-status-warning-bg)",
            fg: "var(--dmx-status-warning-fg)",
            border: "var(--dmx-status-warning-border)",
          },
          progress: {
            bg: "var(--dmx-status-progress-bg)",
            fg: "var(--dmx-status-progress-fg)",
            border: "var(--dmx-status-progress-border)",
          },
          blocked: {
            bg: "var(--dmx-status-blocked-bg)",
            fg: "var(--dmx-status-blocked-fg)",
            border: "var(--dmx-status-blocked-border)",
          },
          draft: {
            bg: "var(--dmx-status-draft-bg)",
            fg: "var(--dmx-status-draft-fg)",
            border: "var(--dmx-status-draft-border)",
          },
          archived: {
            bg: "var(--dmx-status-archived-bg)",
            fg: "var(--dmx-status-archived-fg)",
            border: "var(--dmx-status-archived-border)",
          },
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "var(--dmx-accent-hover)",
          press: "var(--dmx-accent-press)",
          tint: "var(--dmx-accent-tint)",
          text: "var(--dmx-accent-text)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        dimax: {
          ink: "hsl(var(--dimax-ink))",
          "ink-2": "hsl(var(--dimax-ink-2))",
          "ink-3": "hsl(var(--dimax-ink-3))",
          "ink-4": "hsl(var(--dimax-ink-4))",
          paper: "hsl(var(--dimax-paper))",
          "paper-2": "hsl(var(--dimax-paper-2))",
          "paper-3": "hsl(var(--dimax-paper-3))",
          "paper-4": "hsl(var(--dimax-paper-4))",
          rule: "hsl(var(--dimax-rule))",
          "accent-warm": "hsl(var(--dimax-accent-warm))",
          "accent-edge": "hsl(var(--dimax-accent-edge))",
          notice: "hsl(var(--dimax-notice))",
          ok: "hsl(var(--dimax-ok))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--dmx-radius-xl)",
        pill: "var(--dmx-radius-pill)",
      },
      boxShadow: {
        "ring-accent": "var(--dmx-ring-accent)",
        "ring-link": "var(--dmx-ring-link)",
        "ring-danger": "var(--dmx-ring-danger)",
        "ring-warning": "var(--dmx-ring-warning)",
      },
      transitionDuration: {
        fast: "var(--dmx-duration-fast)",
        base: "var(--dmx-duration-base)",
      },
      transitionTimingFunction: {
        standard: "var(--dmx-easing-standard)",
      },
      zIndex: {
        dropdown: "var(--dmx-z-dropdown)",
        sticky: "var(--dmx-z-sticky)",
        drawer: "var(--dmx-z-drawer)",
        modal: "var(--dmx-z-modal)",
        toast: "var(--dmx-z-toast)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "panel-rise": {
          from: { opacity: "0", transform: "translateY(18px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out forwards",
        "panel-rise": "panel-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
