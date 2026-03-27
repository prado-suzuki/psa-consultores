

## Plano: Corrigir a Corrente de Contenção — Causa Raiz Real

### Diagnóstico Final

O problema **não está** nos wrappers internos (`div`, `section`, `Card`). A causa raiz é o **Radix ScrollArea Viewport**.

O componente `ScrollArea` do Radix UI injeta um `<div>` (Viewport) com **`overflow: scroll` inline em ambos os eixos** (horizontal e vertical). Isso significa que:

```text
<ScrollArea className="flex-1">           ← Root: overflow-hidden ✓
  <Viewport style="overflow: scroll">     ← INLINE! Scroll em X e Y
    <div className="p-6 w-full min-w-0">  ← w-full = 100% de um viewport que SCROLLS horizontally
      <Card overflow-x-auto>              ← nunca ativa: o Viewport já absorve a expansão
        <table min-w-max>                 ← 60+ colunas expandem o Viewport, não o Card
```

O Viewport do Radix é o scroll container efetivo. A `<table min-w-max>` expande, o Viewport absorve essa expansão via scroll horizontal interno (invisível, sem scrollbar visível). O `overflow-x-auto` do Card nunca ativa porque, do ponto de vista do Card, seu pai (o Viewport) tem largura infinita.

**Nenhum `min-w-0` ou `overflow-hidden` nos wrappers internos resolve isso** — o Viewport do Radix é quem quebra a corrente.

### Solução

Substituir o `<ScrollArea>` por um `<div>` nativo com scroll vertical e contenção horizontal explícita. Apenas **1 arquivo** precisa mudar:

**`src/components/equipe/dev/DevLayout.tsx` (linhas 350-353)**

```tsx
// De:
<ScrollArea className="flex-1">
  <div className="p-6 w-full min-w-0">{children}</div>
</ScrollArea>

// Para:
<div className="flex-1 overflow-y-auto overflow-x-hidden">
  <div className="p-6 w-full min-w-0">{children}</div>
</div>
```

- `overflow-y-auto`: mantém scroll vertical (substitui o ScrollArea)
- `overflow-x-hidden`: **contém** a largura — força os filhos com `overflow-x-auto` (Card/tabelas) a ativar seus scrollbars internos
- `flex-1`: ocupa o espaço restante no flex column (mesmo comportamento anterior)

### Por que funciona

Com `overflow-x-hidden` no container de conteúdo do DevLayout, a corrente fica:

```text
<main flex-1 min-w-0 overflow-hidden>
  <div flex-1 overflow-y-auto overflow-x-hidden>  ← CONTÉM largura
    <div p-6 w-full min-w-0>                      ← respeita o pai
      <Card overflow-x-auto>                      ← ATIVA scrollbar ✓
        <table min-w-max>                          ← força largura pelo conteúdo
```

### Alterações nos outros arquivos

**Nenhuma.** Os arquivos `ApuracaoDataTable.tsx` e `ApuracaoPisCofins.tsx` já estão corretos com `overflow-x-auto` e `min-w-max`. O único elo quebrado era o ScrollArea do Radix.

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `DevLayout.tsx` | Substituir `<ScrollArea>` por `<div overflow-y-auto overflow-x-hidden>` |

A scrollbar customizada do Radix (estilizada) será perdida — o scroll vertical passa a usar o scrollbar nativo do browser. Se necessário, pode-se estilizar via CSS (`scrollbar-width: thin`), mas funcionalmente é idêntico.

