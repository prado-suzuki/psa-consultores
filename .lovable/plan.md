# Remover "Percentual Aplicado (%)" do modal de Ressarcimento

## Contexto

O popover de **Registrar Ressarcimento** (dentro do `PerDetailModal`) hoje pede `Percentual Aplicado (%)` e grava em `per.porcentagem_psa`. Esse mesmo campo já é preenchido no **Modal Novo PER** (`PerFormModal`), também em `per.porcentagem_psa`.

Resultado: registrar um ressarcimento sobrescreve o percentual definido no cadastro do PER.

A solicitação é manter o percentual apenas no cadastro do PER e removê-lo do fluxo de ressarcimento.

## Importante sobre "remover das tabelas"

Não há colunas separadas: **PerFormModal e o ressarcimento gravam na MESMA coluna** `per.porcentagem_psa`. Como o cadastro do PER continua usando essa coluna, ela **não pode ser dropada**. A limpeza necessária é só remover a escrita feita pelo fluxo de ressarcimento.

(`dcomp.porcentagem_psa` já foi removida em migration anterior — não há coluna duplicada para limpar.)

## Mudanças (frontend apenas)

`src/components/equipe/dev/perdcomp/PerDetailModal.tsx`:

1. Remover o input `Percentual Aplicado (%)` do popover de ressarcimento (linhas ~1046-1058).
2. Remover o state `ressarcimentoPercentual` / `setRessarcimentoPercentual` (linha 173) e seu reset no `onSuccess` (linha 460).
3. Remover o parâmetro `percentual` da `ressarcimentoMutation` (linhas 424, 431, 530-534).
4. Remover o campo `porcentagem_psa` do `.update()` em `per` dentro da mutation (linha 431) — assim o percentual definido no cadastro do PER é preservado.
5. Remover a validação `percentual > 100` no `handleSaveRessarcimento` (linhas 525-529).

## Não muda

- `per.porcentagem_psa` permanece na tabela (alimentado pelo PerFormModal e exibido em `ControlePerdcomp.tsx` linha 777).
- `PerFormModal.tsx`, `CargaPerdcompCSV.tsx`, `DcompFormModal.tsx` (que apenas lê), `sync-perdcomp` edge function — sem alteração.
- Sem migration.

## Validação

- Abrir um PER existente com `porcentagem_psa` setado.
- Registrar um ressarcimento; conferir que `porcentagem_psa` no banco continua igual ao valor original.
- Confirmar que o popover de ressarcimento não tem mais o campo de percentual.
