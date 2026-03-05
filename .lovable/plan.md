

# Corrigir dropdown "Distribuição de Receita" para usar Centros de Custo

## Problema
O campo "Distribuição de Receita (Centros de Custo)" no modal de cadastro de cliente (`NewClientModal.tsx`) está carregando opções da tabela `empresas_faturamento` ao invés da tabela `centros_custo`. O dropdown mostra nomes de empresas (ex: "PSA CONSULTORES") quando deveria mostrar centros de custo.

## Solução

**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx`

1. **Adicionar query para centros de custo** -- criar uma nova query que busca da tabela `centros_custo` (registros ativos, ordenados por código), retornando `id`, `codigo` e `nome`.

2. **Substituir as opções nos dois blocos de "Distribuição de Receita":**
   - Bloco de edição de contrato (linha ~3370): trocar `EMPRESA_FATURAMENTO_OPTIONS` por opções de `centros_custo`
   - Bloco de novo contrato (linha ~3746): mesma substituição
   - O label do item no dropdown passará a mostrar `codigo - nome` do centro de custo
   - O valor armazenado em `cc.empresa` passará a ser o código ou nome do centro de custo (mantendo compatibilidade com o campo JSON existente)

3. **Atualizar placeholder** do `SelectTrigger` de "Empresa / Faturamento" para "Centro de Custo".

Nenhuma alteração de schema é necessária -- a tabela `centros_custo` já existe com os campos `id`, `codigo`, `nome`, `is_active`.

