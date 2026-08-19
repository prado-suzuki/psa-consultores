import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
    // Fica em `warn`, e de propósito: são ~258 ocorrências em 57 arquivos, e
    // transformar isso em erro de build seria apagão, não migração. O aviso
    // trava o crescimento; o número só cai.
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
