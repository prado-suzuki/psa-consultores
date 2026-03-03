

# Unificar fonte de dados de Empresa / Faturamento

## Problema
O `NewClientModal` usa uma lista fixa hardcoded (`EMPRESA_FATURAMENTO_OPTIONS`) com 8 empresas. A sub-aba "Empresa / Faturamento" em Controle de Acessos usa a tabela `empresas_faturamento` no banco. São duas fontes desconectadas.

## Solução

### 1. Seed inicial — popular tabela com dados existentes
Migração SQL para inserir as 8 empresas hardcoded na tabela `empresas_faturamento` (se ainda não existirem):

```sql
INSERT INTO empresas_faturamento (nome) VALUES
  ('PRADO ADVOGADOS'), ('PSA CONSULTORES'), ('PRADO SUZUKI'),
  ('PROFITTO'), ('PROTENUN'), ('PSA ADM JUDICIAL'),
  ('PSA AUDITORES'), ('PSA NORTE')
ON CONFLICT DO NOTHING;
```

### 2. NewClientModal — buscar do banco
**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx`

- Remover o array `EMPRESA_FATURAMENTO_OPTIONS` (linhas 72-81)
- Adicionar query `useQuery` para buscar de `empresas_faturamento` (ativas, ordenadas por nome)
- Substituir referências a `EMPRESA_FATURAMENTO_OPTIONS` pela lista vinda do banco
- Manter o mesmo multi-select UI — apenas a fonte de dados muda

Isso garante que ao cadastrar uma nova empresa na sub-aba de Controle de Acessos, ela automaticamente aparece no dropdown do cadastro de clientes.

