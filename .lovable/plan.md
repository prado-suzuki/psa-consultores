

# Exibir Ressarcimento no Modal de Detalhamento PER

## Problema
Quando um ressarcimento e registrado, nao ha feedback visual no modal. O saldo nao atualiza e os botoes continuam visiveis.

## Solucao

### 1. Query propria para dados atualizados do PER

O `per` e passado como prop e nao se atualiza apos o mutation. Adicionar um `useQuery` interno que busca o PER atualizado pelo `numero_processo_per`, e invalidar essa query no `onSuccess` do `ressarcimentoMutation`.

Usar os dados dessa query (com fallback para o prop) em todo o modal: calculo de saldo, exibicao de ressarcimento, condicional de botoes.

### 2. Bloco visual de ressarcimento (abaixo da tabela de DCOMPs)

Quando `vlr_ressarcido > 0`, exibir um card/banner abaixo da tabela com:

```text
+----------------------------------------------------------+
|  [icone DollarSign]  RESSARCIMENTO REGISTRADO             |
|                                                           |
|  Valor Ressarcido:  R$ 150.000,00                         |
|  Data Pagamento:    15/03/2026                            |
+----------------------------------------------------------+
```

- Fundo verde claro (green-50/green-900), borda green
- Buscar `dt_pagamento` da `per_situacao` mais recente que tenha esse campo preenchido

### 3. Esconder botoes quando PER esta pago

Quando `vlr_ressarcido > 0`:
- Esconder botao "Novo DCOMP"
- Esconder botao "Novo Ressarcimento"
- Exibir badge "Ressarcido" no lugar

### 4. Saldo atualizado automaticamente

Com a query propria, o `saldoRestante` usara o `vlr_ressarcido` atualizado sem precisar reabrir o modal.

## Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `PerDetailModal.tsx` | `useQuery` para PER atualizado; bloco visual de ressarcimento; condicional de botoes; invalidacao de queries |

