import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import plugin from 'tailwindcss/plugin';

// Container queries. O Tailwind 3 (versão deste repo) não as tem nativas — só o
// v4 tem — e o plugin oficial (@tailwindcss/container-queries) não está
// instalado. Este plugin local cobre exatamente o que os formulários OSG usam:
//   `@container`        → declara o elemento como contêiner de consulta
//   `@2xl:grid-cols-3`  → aplica quando o CONTÊINER (não a janela) tem ≥ 42rem
// A escala de nomes é a mesma do plugin oficial e do Tailwind v4, então trocar
// este plugin por um deles depois é remover estas linhas, sem tocar no JSX.
const CONTAINER_SIZES = {
  xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem',
  '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem',
};

const containerQueries = plugin(
  ({ matchUtilities, matchVariant, theme }) => {
    matchUtilities(
      { '@container': (value: string) => ({ 'container-type': value }) },
      { values: { DEFAULT: 'inline-size', normal: 'normal' } },
    );
    matchVariant('@', (value = '') => `@container (min-width: ${value})`, {
      values: theme('containers') ?? {},
    });
  },
  { theme: { containers: CONTAINER_SIZES } },
);

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Work Sans', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        canvas: 'hsl(var(--canvas) / <alpha-value>)',
        /* Fundo dos cartões escuros: o par vai do mais escuro (início do
           gradiente) ao intermediário; o fim é o `--primary` da área. */
        'surface-escura': 'hsl(var(--surface-escura) / <alpha-value>)',
        'surface-escura-2': 'hsl(var(--surface-escura-2) / <alpha-value>)',
        'tool-icon': 'hsl(var(--tool-icon) / <alpha-value>)',
        'tool-icon-bg': 'hsl(var(--tool-icon-bg) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
        },
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        teal: {
          500: 'hsl(var(--teal-500))',
          600: 'hsl(var(--teal-600))',
          700: 'hsl(var(--teal-700))',
        },
        lime: {
          400: 'hsl(var(--lime-400))',
          500: 'hsl(var(--lime-500))',
          600: 'hsl(var(--lime-600))',
        },
        gray: {
          50: 'hsl(var(--gray-50))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
        },
        /* Papéis de status (tarefa e projeto). O valor de cada papel vem do tema
           da área — Tax no :root, OSG em .osg-theme —, então a mesma classe pinta
           teal na Tax e musgo na OSG. `soft` é o fundo da pílula; o tom cheio vale
           para texto, ponto e barra. */
        status: {
          neutro: {
            DEFAULT: 'hsl(var(--status-neutro) / <alpha-value>)',
            soft: 'hsl(var(--status-neutro-soft) / <alpha-value>)',
          },
          fila: {
            DEFAULT: 'hsl(var(--status-fila) / <alpha-value>)',
            soft: 'hsl(var(--status-fila-soft) / <alpha-value>)',
          },
          andamento: {
            DEFAULT: 'hsl(var(--status-andamento) / <alpha-value>)',
            soft: 'hsl(var(--status-andamento-soft) / <alpha-value>)',
          },
          revisao: {
            DEFAULT: 'hsl(var(--status-revisao) / <alpha-value>)',
            soft: 'hsl(var(--status-revisao-soft) / <alpha-value>)',
          },
          espera: {
            DEFAULT: 'hsl(var(--status-espera) / <alpha-value>)',
            soft: 'hsl(var(--status-espera-soft) / <alpha-value>)',
          },
          ajuste: {
            DEFAULT: 'hsl(var(--status-ajuste) / <alpha-value>)',
            soft: 'hsl(var(--status-ajuste-soft) / <alpha-value>)',
          },
          feito: {
            DEFAULT: 'hsl(var(--status-feito) / <alpha-value>)',
            soft: 'hsl(var(--status-feito-soft) / <alpha-value>)',
          },
          alerta: {
            DEFAULT: 'hsl(var(--status-alerta) / <alpha-value>)',
            soft: 'hsl(var(--status-alerta-soft) / <alpha-value>)',
          },
        },
        /* Cor de área — derivada por ordem de criação, global como a categoria.
           Ver o bloco `--area-*` no index.css: a paleta só é adequada porque o
           nome da área vem sempre ao lado do ponto. */
        area: {
          1: 'hsl(var(--area-1) / <alpha-value>)',
          2: 'hsl(var(--area-2) / <alpha-value>)',
          3: 'hsl(var(--area-3) / <alpha-value>)',
          4: 'hsl(var(--area-4) / <alpha-value>)',
          5: 'hsl(var(--area-5) / <alpha-value>)',
          6: 'hsl(var(--area-6) / <alpha-value>)',
          7: 'hsl(var(--area-7) / <alpha-value>)',
          8: 'hsl(var(--area-8) / <alpha-value>)',
        },
        /* Categoria do cliente — atributo de negócio, igual em toda área. */
        categoria: {
          bronze: 'hsl(var(--categoria-bronze) / <alpha-value>)',
          prata: 'hsl(var(--categoria-prata) / <alpha-value>)',
          ouro: 'hsl(var(--categoria-ouro) / <alpha-value>)',
          diamante: 'hsl(var(--categoria-diamante) / <alpha-value>)',
        },
        /* Tons categóricos das tags de texto livre — quatro, sorteados por hash,
           dentro do registro da área. */
        tag: {
          a: 'hsl(var(--tag-a) / <alpha-value>)',
          b: 'hsl(var(--tag-b) / <alpha-value>)',
          c: 'hsl(var(--tag-c) / <alpha-value>)',
          d: 'hsl(var(--tag-d) / <alpha-value>)',
        },
        base: {
          50: 'hsl(var(--base-50) / <alpha-value>)',
          100: 'hsl(var(--base-100) / <alpha-value>)',
          200: 'hsl(var(--base-200) / <alpha-value>)',
          300: 'hsl(var(--base-300) / <alpha-value>)',
          500: 'hsl(var(--base-500) / <alpha-value>)',
          600: 'hsl(var(--base-600) / <alpha-value>)',
          700: 'hsl(var(--base-700) / <alpha-value>)',
        },
        osg: {
          50: 'hsl(var(--osg-50) / <alpha-value>)',
          100: 'hsl(var(--osg-100) / <alpha-value>)',
          200: 'hsl(var(--osg-200) / <alpha-value>)',
          300: 'hsl(var(--osg-300) / <alpha-value>)',
          500: 'hsl(var(--osg-500) / <alpha-value>)',
          600: 'hsl(var(--osg-600) / <alpha-value>)',
          700: 'hsl(var(--osg-700) / <alpha-value>)',
          moss: 'hsl(var(--osg-moss) / <alpha-value>)',
          highlighter: 'hsl(var(--osg-highlighter) / <alpha-value>)',
          canvas: 'hsl(var(--osg-canvas) / <alpha-value>)',
          red: 'hsl(var(--osg-red) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-hero': 'var(--gradient-hero)',
      },
      boxShadow: {
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        /* 4px. Existe para elementos PEQUENOS, onde os degraus de cima passam de
           raio a forma: com `--radius` em 0.75rem, o `sm` dá 8px, que num
           quadrado de 16px é metade do lado — ou seja, um círculo. Era o que
           acontecia com a caixa de seleção, que assim ficava idêntica ao botão
           de rádio (`rounded-full`, mesmo tamanho, mesma borda) no app inteiro.
           A escala não estava errada; faltava um degrau para o miúdo. */
        xs: 'calc(var(--radius) - 8px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        // Abertura/fechamento dos modais OSG: entrada com física de mola —
        // sobe de baixo, passa levemente do centro (overshoot) e assenta. Só
        // transform + opacity (compositados na GPU) para rodar liso; nada de
        // filter/blur animado, que causa repaint e engasga. O centramento
        // (-50%, -50%) fica embutido em cada stop pra o conteúdo não sair do
        // eixo durante a animação. Restrito à OSG (ver OsgDialog).
        'osg-modal-in': {
          '0%': { opacity: '0', transform: 'translate(-50%, calc(-50% + 28px)) scale(0.94)' },
          '55%': { opacity: '1', transform: 'translate(-50%, calc(-50% - 7px)) scale(1.015)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'osg-modal-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, calc(-50% + 14px)) scale(0.96)' },
        },
        'osg-overlay-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'osg-overlay-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        // Entrada de conteúdo OSG (troca de empresa no Quadro Societário):
        // fade + subida curta, escalonável via animation-delay inline. Só
        // transform/opacity (GPU); fill-mode "both" segura o estado inicial
        // durante o delay para o elemento não piscar antes de entrar.
        'osg-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Barras de participação crescendo da esquerda (usar com origin-left).
        'osg-bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        // Entrada de cards com hover animado (Biblioteca de Modelos): só o
        // "from" é declarado — o "to" implícito usa o estilo computado do
        // elemento, então cards com opacidade própria (ex.: inativos a 60%)
        // assentam no valor certo sem piscar. Usar com fill "backwards" (não
        // "both"/"forwards"): segura o estado inicial durante o delay do
        // stagger e libera o transform ao terminar, senão a animação
        // preenchida sobrepõe o scale/translate do hover para sempre.
        'osg-card-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
        },
        // Loader da área Tax (ver TaxLoader): a moeda cai de fora do quadro,
        // girando, entra no cofrinho e o porquinho dá um pulinho. Os valores de
        // translate estão em unidades do viewBox do glyph (0 0 1024 1024), não
        // em px de tela — transform em SVG opera no sistema local, então o
        // loader escala junto com `size`.
        // Queda com aceleração de gravidade (ease-in) e desaceleração curta ao
        // afundar no lombo; a moeda só apaga DEPOIS de estar escondida atrás do
        // corpo (translateY 320), senão pareceria sumir no ar.
        'tax-coin-fall': {
          '0%': {
            transform: 'translateY(-620px)',
            opacity: '0',
            animationTimingFunction: 'cubic-bezier(.45,0,.85,.35)',
          },
          '7%': { opacity: '1' },
          '46%': {
            transform: 'translateY(0)',
            opacity: '1',
            animationTimingFunction: 'cubic-bezier(.35,0,.5,1)',
          },
          '64%': { transform: 'translateY(320px)', opacity: '1' },
          '65%, 100%': { transform: 'translateY(320px)', opacity: '0' },
        },
        // Giro da moeda fingido por scaleX (achatar/voltar) — 2 voltas durante a
        // queda e nada depois de assentar. Precisa de transform-origin no centro
        // da moeda (definido inline no TaxLoader).
        'tax-coin-spin': {
          '0%': { transform: 'scaleX(1)' },
          '11%': { transform: 'scaleX(.26)' },
          '22%': { transform: 'scaleX(1)' },
          '33%': { transform: 'scaleX(.26)' },
          '44%, 100%': { transform: 'scaleX(1)' },
        },
        // Pulinho/absorção do impacto: squash and stretch com origem na base das
        // patas, sincronizado com o instante em que a moeda toca o lombo (46%).
        'tax-pig-bounce': {
          '0%, 42%': { transform: 'scale(1, 1)' },
          '50%': { transform: 'scale(1.05, .94)' },
          '59%': { transform: 'scale(.985, 1.022)' },
          '70%, 100%': { transform: 'scale(1, 1)' },
        },
        // Brilhos do "ka-ching" na hora que a moeda entra.
        'tax-glint': {
          '0%, 41%': { opacity: '0', transform: 'scale(.4)' },
          '51%': { opacity: '.9', transform: 'scale(1)' },
          '68%, 100%': { opacity: '0', transform: 'scale(1.3)' },
        },

        // ——— Loader OSG Work: a passada do Sísifo ———
        //
        // VALORES GERADOS, NÃO ESCOLHIDOS A MÃO. São 16 amostras de cinemática
        // inversa: para cada instante do ciclo fixou-se onde o pé tem que estar
        // (colado na ladeira no apoio, em arco no ar na recuperação) e resolveu-se
        // o par quadril/joelho que leva o tornozelo até lá. Editar um ângulo
        // isolado descola o pé da rampa — refaça a conta em vez de ajustar a olho.
        //
        // As paradas são de 6,25% porque o vértice do ciclo (o instante em que o pé
        // descola, 62,5%) precisa CAIR na grade. Fora dela a interpolação corta a
        // curva no canto e o erro cresce ao adicionar paradas, em vez de diminuir.
        //
        // 0% e 100% são idênticos em todas as trilhas: o loop fecha sem emenda.
        // A perna de trás tem amplitude menor de propósito — ver nota em
        // `osgWorkGlyph.ts`. As quatro trilhas compartilham a duração; mexer na de
        // uma só tira as pernas de contrafase.
        'osg-sisyphus-hip-rear': {
          '0%, 100%': { transform: 'rotate(-14.0deg)' },
          '6.25%': { transform: 'rotate(-12.4deg)' },
          '12.5%': { transform: 'rotate(-10.1deg)' },
          '18.75%': { transform: 'rotate(-7.4deg)' },
          '25%': { transform: 'rotate(-4.8deg)' },
          '31.25%': { transform: 'rotate(-2.4deg)' },
          '37.5%': { transform: 'rotate(-0.7deg)' },
          '43.75%': { transform: 'rotate(0.3deg)' },
          '50%': { transform: 'rotate(0.4deg)' },
          '56.25%': { transform: 'rotate(4.7deg)' },
          '62.5%': { transform: 'rotate(9.2deg)' },
          '68.75%': { transform: 'rotate(3.7deg)' },
          '75%': { transform: 'rotate(-1.7deg)' },
          '81.25%': { transform: 'rotate(-6.6deg)' },
          '87.5%': { transform: 'rotate(-10.5deg)' },
          '93.75%': { transform: 'rotate(-13.1deg)' },
        },
        'osg-sisyphus-knee-rear': {
          '0%, 100%': { transform: 'rotate(20.4deg)' },
          '6.25%': { transform: 'rotate(16.9deg)' },
          '12.5%': { transform: 'rotate(12.6deg)' },
          '18.75%': { transform: 'rotate(8.1deg)' },
          '25%': { transform: 'rotate(3.8deg)' },
          '31.25%': { transform: 'rotate(0.4deg)' },
          '37.5%': { transform: 'rotate(-1.5deg)' },
          '43.75%': { transform: 'rotate(-1.9deg)' },
          '50%': { transform: 'rotate(-0.7deg)' },
          '56.25%': { transform: 'rotate(-9.5deg)' },
          '62.5%': { transform: 'rotate(-19.1deg)' },
          '68.75%': { transform: 'rotate(-6.6deg)' },
          '75%': { transform: 'rotate(4.4deg)' },
          '81.25%': { transform: 'rotate(12.8deg)' },
          '87.5%': { transform: 'rotate(18.3deg)' },
          '93.75%': { transform: 'rotate(20.8deg)' },
        },
        'osg-sisyphus-hip-front': {
          '0%, 100%': { transform: 'rotate(23.9deg)' },
          '6.25%': { transform: 'rotate(31.3deg)' },
          '12.5%': { transform: 'rotate(35.1deg)' },
          '18.75%': { transform: 'rotate(20.0deg)' },
          '25%': { transform: 'rotate(-2.7deg)' },
          '31.25%': { transform: 'rotate(-27.5deg)' },
          '37.5%': { transform: 'rotate(-38.2deg)' },
          '43.75%': { transform: 'rotate(-31.3deg)' },
          '50%': { transform: 'rotate(-15.5deg)' },
          '56.25%': { transform: 'rotate(-13.0deg)' },
          '62.5%': { transform: 'rotate(-9.8deg)' },
          '68.75%': { transform: 'rotate(-5.8deg)' },
          '75%': { transform: 'rotate(-0.7deg)' },
          '81.25%': { transform: 'rotate(5.4deg)' },
          '87.5%': { transform: 'rotate(12.1deg)' },
          '93.75%': { transform: 'rotate(18.6deg)' },
        },
        'osg-sisyphus-knee-front': {
          '0%, 100%': { transform: 'rotate(-6.7deg)' },
          '6.25%': { transform: 'rotate(-12.4deg)' },
          '12.5%': { transform: 'rotate(-16.1deg)' },
          '18.75%': { transform: 'rotate(6.5deg)' },
          '25%': { transform: 'rotate(26.1deg)' },
          '31.25%': { transform: 'rotate(35.3deg)' },
          '37.5%': { transform: 'rotate(28.4deg)' },
          '43.75%': { transform: 'rotate(10.2deg)' },
          '50%': { transform: 'rotate(-11.5deg)' },
          '56.25%': { transform: 'rotate(-12.2deg)' },
          '62.5%': { transform: 'rotate(-10.9deg)' },
          '68.75%': { transform: 'rotate(-8.9deg)' },
          '75%': { transform: 'rotate(-6.9deg)' },
          '81.25%': { transform: 'rotate(-5.8deg)' },
          '87.5%': { transform: 'rotate(-5.5deg)' },
          '93.75%': { transform: 'rotate(-6.0deg)' },
        },
        // Um sobe-e-desce por passo. Vai a -4 e volta via `alternate`, então a
        // duração é metade da passada. As 4 unidades já entraram na conta da
        // cinemática inversa: mudá-las tira o pé da rampa.
        'osg-sisyphus-bob': {
          to: { transform: 'translateY(-4px)' },
        },
        // Volta inteira por ciclo, senão o retorno a zero apareceria como salto.
        'osg-sisyphus-roll': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Entrada com overshoot de mola (~0.42s); saída curta e seca.
        'osg-modal-in': 'osg-modal-in 0.42s cubic-bezier(0.34, 1.2, 0.42, 1)',
        'osg-modal-out': 'osg-modal-out 0.2s cubic-bezier(0.4, 0, 1, 1)',
        'osg-overlay-in': 'osg-overlay-in 0.3s ease-out',
        'osg-overlay-out': 'osg-overlay-out 0.2s ease-in',
        'osg-rise': 'osg-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        'osg-bar-grow': 'osg-bar-grow 1.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        'osg-card-in': 'osg-card-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) backwards',
        // Ciclo do loader Tax: 1s. Todas as quatro animações compartilham a
        // mesma duração para os tempos (impacto, pulinho, brilho) casarem —
        // mexer na duração de uma só desalinha o pulinho da queda.
        'tax-coin-fall': 'tax-coin-fall 1s linear infinite',
        'tax-coin-spin': 'tax-coin-spin 1s linear infinite',
        'tax-pig-bounce': 'tax-pig-bounce 1s ease-out infinite',
        'tax-glint': 'tax-glint 1s ease-out infinite',
        // Ciclo do loader OSG: 1s = duas passadas. As quatro trilhas das pernas são
        // `linear` porque a curva JÁ está nos keyframes (16 amostras de cinemática
        // inversa) — qualquer easing aqui deforma a trajetória do pé e o descola da
        // ladeira. As quatro compartilham a duração; mexer na de uma só tira as
        // pernas de contrafase, e as outras duas abaixo são frações desta.
        'osg-sisyphus-hip-rear': 'osg-sisyphus-hip-rear 1s linear infinite',
        'osg-sisyphus-knee-rear': 'osg-sisyphus-knee-rear 1s linear infinite',
        'osg-sisyphus-hip-front': 'osg-sisyphus-hip-front 1s linear infinite',
        'osg-sisyphus-knee-front': 'osg-sisyphus-knee-front 1s linear infinite',
        // Um quarto do ciclo, ida e volta: dá um sobe-e-desce por passo.
        'osg-sisyphus-bob': 'osg-sisyphus-bob 0.25s ease-in-out infinite alternate',
        // Quatro passadas por volta da pedra — devagar, que é uma pedra.
        'osg-sisyphus-roll': 'osg-sisyphus-roll 4s linear infinite',
      },
    },
  },
  plugins: [animate, containerQueries],
} satisfies Config;
