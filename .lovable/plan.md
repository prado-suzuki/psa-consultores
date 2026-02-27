

# Correção de Dados e Refinamento Visual do PERDCOMP

## 1. Correção de Dados: PerFormModal.tsx

O modal de criação (`PerFormModal.tsx`) usa strings hardcoded `'cliente'` e `'contribuinte'` nas queries dos selects (linhas 160 e 175), enquanto a tela de listagem usa `TABLE_NAMES`. Isso faz com que no preview o modal salve IDs de producao em vez de IDs de dev.

### Alteracoes em `src/components/equipe/dev/perdcomp/PerFormModal.tsx`:

- Adicionar import de `TABLE_NAMES` do `@/config/api`
- Linha 160: trocar `.from('cliente')` por `.from(TABLE_NAMES.cliente)`
- Linha 175: trocar `.from('contribuinte')` por `.from(TABLE_NAMES.contribuinte)`
- Atualizar as `queryKey` para incluir o nome da tabela dinamica, evitando cache cruzado

## 2. Refinamento Visual: ControlePerdcomp.tsx

### 2a. Botao "Limpar filtros" (linha 837)

O botao ja esta com `variant="outline"` e classes corretas (`text-red-600 border-red-300 hover:bg-red-50`). Analisando o codigo atual, ele ja segue o padrao solicitado. Nenhuma alteracao necessaria aqui.

### 2b. Respiro visual no rodape dos filtros (linha 835)

A div do rodape ja tem `mt-6 pt-4 border-t`. O layout atual ja contempla o espacamento solicitado. Nenhuma alteracao necessaria.

### 2c. Botao "+ Novo PER" (linhas 852-858)

O botao ja esta posicionado no CardHeader do card de Resultados, alinhado a direita com `flex flex-row items-center justify-between`. Ja esta no local correto conforme solicitado.

### 2d. Cabecalho da tabela (linha 459)

O `TableHeader` ja possui as classes `[&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-700`. Ja esta reforçado conforme solicitado.

## Resumo

Apos analise detalhada, a unica alteracao real necessaria e no **PerFormModal.tsx** -- as melhorias visuais solicitadas para o ControlePerdcomp ja estao implementadas no codigo atual.

### Arquivo alterado

| Arquivo | Alteracao |
|---|---|
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Importar `TABLE_NAMES`, trocar `.from('cliente')` e `.from('contribuinte')` pelas constantes |

