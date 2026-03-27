

## Diagnóstico: Por que o scroll horizontal não funciona

O problema está na cadeia de containers pai, não nos wrappers das tabelas:

```text
<main className="flex-1 flex flex-col min-w-0 overflow-hidden">
  <ScrollArea className="flex-1">        ← só scroll vertical
    <div className="p-6">               ← SEM restrição de largura
      <Card overflow-x-auto>            ← tenta scrollar, mas...
        <Table>                          ← 60+ colunas expandem tudo
```

O `<div className="p-6">` dentro do `ScrollArea` **não tem largura máxima nem overflow restrito**. Ele expande livremente com o conteúdo da tabela. Como o `overflow-x-auto` dos Cards/tabelas depende de um container pai com largura fixa, o scroll nunca é ativado — o div simplesmente cresce e o `overflow-hidden` do `<main>` corta tudo.

## Correção

**Arquivo: `src/components/equipe/dev/DevLayout.tsx` (linha 352)**

Alterar:
```tsx
<div className="p-6">{children}</div>
```
Para:
```tsx
<div className="p-6 max-w-full overflow-x-hidden">{children}</div>
```

`overflow-x-hidden` neste container força os filhos (Cards com `overflow-x-auto`) a respeitar a largura disponível e ativar seus próprios scrollbars horizontais. `max-w-full` garante que não expanda além do pai.

**Só uma linha muda.** As alterações já feitas nos Cards e `ApuracaoDataTable` passam a funcionar corretamente.

