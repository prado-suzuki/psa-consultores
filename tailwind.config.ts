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
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        canvas: "hsl(var(--canvas) / <alpha-value>)",
        "tool-icon": "hsl(var(--tool-icon) / <alpha-value>)",
        "tool-icon-bg": "hsl(var(--tool-icon-bg) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
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
        tax: {
          50: "hsl(var(--tax-50) / <alpha-value>)",
          100: "hsl(var(--tax-100) / <alpha-value>)",
          200: "hsl(var(--tax-200) / <alpha-value>)",
          300: "hsl(var(--tax-300) / <alpha-value>)",
          500: "hsl(var(--tax-500) / <alpha-value>)",
          600: "hsl(var(--tax-600) / <alpha-value>)",
          700: "hsl(var(--tax-700) / <alpha-value>)",
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
          highlighter: "hsl(var(--osg-highlighter) / <alpha-value>)",
          canvas: "hsl(var(--osg-canvas) / <alpha-value>)",
          red: "hsl(var(--osg-red) / <alpha-value>)",
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
        // Abertura/fechamento dos modais OSG: entrada com física de mola —
        // sobe de baixo, passa levemente do centro (overshoot) e assenta. Só
        // transform + opacity (compositados na GPU) para rodar liso; nada de
        // filter/blur animado, que causa repaint e engasga. O centramento
        // (-50%, -50%) fica embutido em cada stop pra o conteúdo não sair do
        // eixo durante a animação. Restrito à OSG (ver OsgDialog).
        "osg-modal-in": {
          "0%": { opacity: "0", transform: "translate(-50%, calc(-50% + 28px)) scale(0.94)" },
          "55%": { opacity: "1", transform: "translate(-50%, calc(-50% - 7px)) scale(1.015)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "osg-modal-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, calc(-50% + 14px)) scale(0.96)" },
        },
        "osg-overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "osg-overlay-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        // Entrada de conteúdo OSG (troca de empresa no Quadro Societário):
        // fade + subida curta, escalonável via animation-delay inline. Só
        // transform/opacity (GPU); fill-mode "both" segura o estado inicial
        // durante o delay para o elemento não piscar antes de entrar.
        "osg-rise": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Barras de participação crescendo da esquerda (usar com origin-left).
        "osg-bar-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        // Entrada de cards com hover animado (Biblioteca de Modelos): só o
        // "from" é declarado — o "to" implícito usa o estilo computado do
        // elemento, então cards com opacidade própria (ex.: inativos a 60%)
        // assentam no valor certo sem piscar. Usar com fill "backwards" (não
        // "both"/"forwards"): segura o estado inicial durante o delay do
        // stagger e libera o transform ao terminar, senão a animação
        // preenchida sobrepõe o scale/translate do hover para sempre.
        "osg-card-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
        },
        // Loader da área Tax (ver TaxLoader): a moeda cai de fora do quadro,
        // girando, entra no cofrinho e o porquinho dá um pulinho. Os valores de
        // translate estão em unidades do viewBox do glyph (0 0 1024 1024), não
        // em px de tela — transform em SVG opera no sistema local, então o
        // loader escala junto com `size`.
        // Queda com aceleração de gravidade (ease-in) e desaceleração curta ao
        // afundar no lombo; a moeda só apaga DEPOIS de estar escondida atrás do
        // corpo (translateY 320), senão pareceria sumir no ar.
        "tax-coin-fall": {
          "0%": { transform: "translateY(-620px)", opacity: "0", animationTimingFunction: "cubic-bezier(.45,0,.85,.35)" },
          "7%": { opacity: "1" },
          "46%": { transform: "translateY(0)", opacity: "1", animationTimingFunction: "cubic-bezier(.35,0,.5,1)" },
          "64%": { transform: "translateY(320px)", opacity: "1" },
          "65%, 100%": { transform: "translateY(320px)", opacity: "0" },
        },
        // Giro da moeda fingido por scaleX (achatar/voltar) — 2 voltas durante a
        // queda e nada depois de assentar. Precisa de transform-origin no centro
        // da moeda (definido inline no TaxLoader).
        "tax-coin-spin": {
          "0%": { transform: "scaleX(1)" },
          "11%": { transform: "scaleX(.26)" },
          "22%": { transform: "scaleX(1)" },
          "33%": { transform: "scaleX(.26)" },
          "44%, 100%": { transform: "scaleX(1)" },
        },
        // Pulinho/absorção do impacto: squash and stretch com origem na base das
        // patas, sincronizado com o instante em que a moeda toca o lombo (46%).
        "tax-pig-bounce": {
          "0%, 42%": { transform: "scale(1, 1)" },
          "50%": { transform: "scale(1.05, .94)" },
          "59%": { transform: "scale(.985, 1.022)" },
          "70%, 100%": { transform: "scale(1, 1)" },
        },
        // Brilhos do "ka-ching" na hora que a moeda entra.
        "tax-glint": {
          "0%, 41%": { opacity: "0", transform: "scale(.4)" },
          "51%": { opacity: ".9", transform: "scale(1)" },
          "68%, 100%": { opacity: "0", transform: "scale(1.3)" },
        },
        // Loader da área OSG Work (ver OsgWorkLoader): o Sísifo NÃO anda na ladeira
        // — fica na posição do ícone e só as pernas e a pedra se mexem. É o que faz
        // o ciclo fechar sem costura, sem volta ao ponto de partida para disfarçar.
        //
        // Giro da pedra: contínuo e linear, uma volta inteira por ciclo. Tem de ser
        // volta inteira: parar em qualquer ângulo intermediário faria a pedra saltar
        // de volta ao zero na virada do loop. As crateras é que mostram o giro (o
        // contorno do disco é o mesmo em qualquer ângulo).
        "osg-sisyphus-roll": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        // Passada: as duas pernas vão e voltam em contrafase, duas passadas por
        // ciclo, girando no quadril. Ângulo positivo = perna para TRÁS. A dianteira
        // usa amplitude menor porque o corte dela atravessa a dobra do joelho: acima
        // de ~5° a junta começa a aparecer.
        "osg-sisyphus-leg-rear": {
          "0%, 100%": { transform: "rotate(-7deg)" },
          "50%": { transform: "rotate(7deg)" },
        },
        "osg-sisyphus-leg-front": {
          "0%, 100%": { transform: "rotate(5deg)" },
          "50%": { transform: "rotate(-5deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Entrada com overshoot de mola (~0.42s); saída curta e seca.
        "osg-modal-in": "osg-modal-in 0.42s cubic-bezier(0.34, 1.2, 0.42, 1)",
        "osg-modal-out": "osg-modal-out 0.2s cubic-bezier(0.4, 0, 1, 1)",
        "osg-overlay-in": "osg-overlay-in 0.3s ease-out",
        "osg-overlay-out": "osg-overlay-out 0.2s ease-in",
        "osg-rise": "osg-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "osg-bar-grow": "osg-bar-grow 1.4s cubic-bezier(0.16, 1, 0.3, 1) both",
        "osg-card-in": "osg-card-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) backwards",
        // Ciclo do loader Tax: 1s. Todas as quatro animações compartilham a
        // mesma duração para os tempos (impacto, pulinho, brilho) casarem —
        // mexer na duração de uma só desalinha o pulinho da queda.
        "tax-coin-fall": "tax-coin-fall 1s linear infinite",
        "tax-coin-spin": "tax-coin-spin 1s linear infinite",
        "tax-pig-bounce": "tax-pig-bounce 1s ease-out infinite",
        "tax-glint": "tax-glint 1s ease-out infinite",
        // Loader OSG Work: passada de 2s (mais lenta que o ciclo da Tax de
        // propósito — é esforço, não impacto) e a pedra dando uma volta a cada 6s,
        // que são 3 passadas. Períodos diferentes de propósito: nenhum dos dois
        // precisa voltar ao início junto, e a pedra pesada pede giro lento.
        // Ambas com ease-in-out e sem parada, para o loop não ter emenda.
        "osg-sisyphus-roll": "osg-sisyphus-roll 6s linear infinite",
        "osg-sisyphus-leg-rear": "osg-sisyphus-leg-rear 2s ease-in-out infinite",
        "osg-sisyphus-leg-front": "osg-sisyphus-leg-front 2s ease-in-out infinite",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
