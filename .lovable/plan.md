
# Correcao: Busca manual no PERDCOMP

## Problema

A variavel `searched` e inicializada como `true` (linha 87). Quando o usuario seleciona um contribuinte (ou quando ele e auto-selecionado por haver apenas um), as queries de PER, DCOMP e Situacoes disparam automaticamente porque a condicao `enabled: searched && !!contribuinteId` ja esta satisfeita.

## Solucao

Alterar a inicializacao de `searched` de `true` para `false` (linha 87):

```typescript
// De:
const [searched, setSearched] = useState(true);
// Para:
const [searched, setSearched] = useState(false);
```

Isso garante que os dados so serao buscados quando o usuario clicar no botao "Buscar", que chama `setSearched(true)`.

## Arquivo alterado

`src/pages/equipe/dev/ControlePerdcomp.tsx` -- uma unica linha.
