import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import uiTokens from "./eslint-rules/token-nao-sobrescrito.js";
import corForaDaEscala from "./eslint-rules/cor-fora-da-escala.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-case-declarations": "warn",
      "no-empty": "warn",
      "no-irregular-whitespace": "warn",
      "prefer-const": "warn",
    },
  },
  {
    // ── Token do `ui/` sobrescrito por cor crua ────────────────────────────
    //
    // Os componentes de `src/components/ui/` chegam com o token certo de
    // fábrica. Quando a `className` local escreve cor fixa na MESMA propriedade,
    // ela não acrescenta nada: substitui o token, e a tela para de acompanhar o
    // tema. Foram 19 casos assim só no Controle de Acessos, e nenhum era
    // redundância.
    //
    // Está em `error`, e a passagem por `warn` foi a migração, não o regime.
    // Nasceu em `warn` porque a fila era grande e travar o build seria apagão;
    // com a fila em zero, `warn` deixou de proteger nada. O `bun run lint` da CI
    // é `eslint .`, sem `--max-warnings`: aviso passa. Manter em `warn` com a
    // dívida zerada significa que a próxima sobrescrita entra sem resistência e
    // a fila recomeça — o trabalho se desfaz sozinho, sem ninguém perceber. Em
    // `error`, o zero é o piso.
    //
    // Isto NÃO vale para a regra do teal, abaixo: aquela ainda tem centenas de
    // ocorrências e continua em `warn` por isso. A diferença entre as duas é o
    // tamanho da fila, não o critério.
    //
    // A regra NÃO acusa composição (propriedade diferente) nem sobrescrita para
    // outro token (escolha de hierarquia). O `ui/` fica fora: ele é o dono do
    // padrão, não consumidor. Para medir agora:
    //
    //   bunx eslint src --rule '{}' | grep -c token-nao-sobrescrito
    files: ["src/**/*.tsx"],
    ignores: ["src/components/ui/**"],
    plugins: { ui: uiTokens },
    rules: { "ui/token-nao-sobrescrito": "error" },
  },
  {
    // ── Tom que a escala não tem ──────────────────────────────────────────
    //
    // As cores deste projeto ficam em `theme.extend.colors`, e "extend" SOMA
    // com a paleta do Tailwind em vez de substituir. Daí o mesmo erro — digitar
    // um tom que não existe — dar dois resultados opostos:
    //
    // · Nome que só existe aqui (`osg`, `base`, `status`, `tag`…): não há
    //   estoque para cair, a regra NÃO É GERADA, e o elemento fica com a cor
    //   herdada. `text-osg-800` atravessou meses assim nos títulos de seção dos
    //   relatórios da OSG, e `shadow-osg-900` estava no `OsgLayout`, ou seja em
    //   todas as 25 rotas da área. É `cor-inexistente`.
    //
    // · Nome que o Tailwind também tem (`teal`, `lime`, `gray`): o tom faltante
    //   vem do estoque. `bg-teal-600` é o teal institucional; `bg-teal-100` é o
    //   do Tailwind vestindo o nome da marca. É `cor-de-estoque`.
    //
    // `cor-inexistente` nasce em `error` pelo mesmo critério que este arquivo
    // já aplica logo acima: a fila foi zerada antes (nenhuma sobrou no `src`),
    // e `warn` sobre fila vazia não protege nada. `cor-de-estoque` fica em
    // `warn` porque a fila dela ainda tem centenas — é migração, não regime.
    //
    // Vale para `.ts` também, e o `ui/` NÃO fica de fora: classe que não pinta
    // é defeito em qualquer lugar, inclusive no dono do padrão.
    //
    // A escala não está escrita na regra — ela lê o `tailwind.config.ts`, e
    // `cor-fora-da-escala.test.ts` compara o que ela extrai com o config
    // importado de verdade. Para medir a fila da segunda:
    //
    //   bunx eslint src | grep -c escala/cor-de-estoque
    files: ["src/**/*.{ts,tsx}"],
    plugins: { escala: corForaDaEscala },
    rules: {
      "escala/cor-inexistente": "error",
      "escala/cor-de-estoque": "error",
    },
  },
  {
    // ── `--teal-*` é PRIMITIVA, não token de componente ────────────────────
    //
    // As classes `teal-500`, `teal-600` e `teal-700` parecem cor crua do
    // Tailwind e não são: o `tailwind.config.ts` as remapeia para
    // `hsl(var(--teal-N))`. `bg-teal-600` não pinta o #0D9488 do Tailwind —
    // pinta o #0A756C da escala institucional.
    //
    // É por isso que elas atravessaram todas as revisões: quem procura hex ou
    // paleta crua não as encontra, e no tema base o resultado era idêntico ao
    // de `bg-primary`. Mas a escala mora no `:root` e NENHUM tema a
    // sobrescreve — então é token que não acompanha o tema. Quando
    // `/equipe/acessos` virou grafite, os botões continuaram teal.
    //
    // A escala existe para ALIMENTAR os tokens semânticos no `index.css`.
    // Componente usa `bg-primary`, `text-primary`, `border-primary` — ou, em
    // botão primário, nenhuma classe de cor: a variante `default` já faz.
    //
    // Fica em `warn`, e de propósito: são centenas de ocorrências espalhadas, e
    // transformar isso em erro de build seria apagão, não migração. O aviso
    // trava o crescimento; o número só cai.
    //
    // O número exato NÃO fica escrito aqui — comentário com contagem é
    // verdadeiro no instante em que se escreve e falso na mudança seguinte.
    // Para medir agora:
    //
    //   grep -rnoE 'teal-(500|600|700)' src/components src/pages | wc -l
    //
    // O total de AVISOS é menor que o de ocorrências, e isso é esperado: a regra
    // casa o nó (`Literal`/`TemplateElement`), então várias ocorrências dentro
    // da mesma string contam como um aviso só.
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/\\bteal-(500|600|700)\\b/]",
          message:
            "--teal-500/600/700 é primitiva da escala institucional, não token de componente: ela mora no :root e nenhum tema a sobrescreve, então a cor não acompanha a área. Use bg-primary/text-primary/border-primary — ou, em botão primário, a variante `default` do ui/button, sem classe de cor.",
        },
        {
          selector: "TemplateElement[value.raw=/\\bteal-(500|600|700)\\b/]",
          message:
            "--teal-500/600/700 é primitiva da escala institucional, não token de componente: ela mora no :root e nenhum tema a sobrescreve, então a cor não acompanha a área. Use bg-primary/text-primary/border-primary — ou, em botão primário, a variante `default` do ui/button, sem classe de cor.",
        },
      ],
    },
  },
);
