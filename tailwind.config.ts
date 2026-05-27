import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

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
        sans: ['Work Sans', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
        teal: {
          500: "hsl(var(--teal-500))",
          600: "hsl(var(--teal-600))",
          700: "hsl(var(--teal-700))",
        },
        lime: {
          400: "hsl(var(--lime-400))",
          500: "hsl(var(--lime-500))",
          600: "hsl(var(--lime-600))",
        },
        gray: {
          50: "hsl(var(--gray-50))",
          400: "hsl(var(--gray-400))",
          500: "hsl(var(--gray-500))",
          600: "hsl(var(--gray-600))",
          700: "hsl(var(--gray-700))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
        },
        osg: {
          50: "hsl(var(--osg-50) / <alpha-value>)",
          100: "hsl(var(--osg-100) / <alpha-value>)",
          200: "hsl(var(--osg-200) / <alpha-value>)",
          300: "hsl(var(--osg-300) / <alpha-value>)",
          500: "hsl(var(--osg-500) / <alpha-value>)",
          600: "hsl(var(--osg-600) / <alpha-value>)",
          700: "hsl(var(--osg-700) / <alpha-value>)",
          moss: "hsl(var(--osg-moss) / <alpha-value>)",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-hero': 'var(--gradient-hero)',
      },
      boxShadow: {
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        // Abertura/fechamento dos modais OSG: rise sutil + leve escala, com o
        // centramento (-50%, -50%) embutido para o conteúdo não sair do eixo
        // durante a animação. Mantido aqui (e não no dialog global) para ficar
        // restrito à OSG. Ver OsgDialog.tsx.
        "osg-modal-in": {
          from: { opacity: "0", transform: "translate(-50%, calc(-50% + 8px)) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "osg-modal-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, calc(-50% + 8px)) scale(0.97)" },
        },
        "osg-overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "osg-overlay-out": { from: { opacity: "1" }, to: { opacity: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // ease-out-expo na entrada (suave, "assenta" no fim); saída mais curta.
        "osg-modal-in": "osg-modal-in 0.26s cubic-bezier(0.16, 1, 0.3, 1)",
        "osg-modal-out": "osg-modal-out 0.18s cubic-bezier(0.4, 0, 1, 1)",
        "osg-overlay-in": "osg-overlay-in 0.26s ease-out",
        "osg-overlay-out": "osg-overlay-out 0.18s ease-in",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
