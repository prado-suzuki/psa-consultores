

## Plano: Swap simples de IDs dos contribuintes Granlider

### Objetivo
Trocar os UUIDs para que o contribuinte **ativo** fique com o ID do DW (`b0d3712c`) e o **excluído** fique com `e3291d4f`.

### Dados atuais

| Registro | UUID atual | cliente excluido? |
|---|---|---|
| Ativo | `e3291d4f-c014-4f89-829e-c7bddfbcd5ba` | não |
| Antigo (DW) | `b0d3712c-42ad-4519-a3be-88b6463cd733` | sim |

Não há FK formal na tabela `contribuinte`, mas há referências em `inscricao_contribuinte` e `contribuinte_bal_config` que precisam acompanhar o swap.

### Migração SQL (1 transação, UUID temporário como ponte)

```sql
DO $$
DECLARE
  old_id uuid := 'b0d3712c-42ad-4519-a3be-88b6463cd733';
  new_id uuid := 'e3291d4f-c014-4f89-829e-c7bddfbcd5ba';
  temp_id uuid := gen_random_uuid();
BEGIN
  -- 1. Mover antigo para temp (liberar old_id)
  UPDATE contribuinte SET id = temp_id WHERE id = old_id;
  UPDATE contribuinte_bal_config SET id_contribuinte = temp_id WHERE id_contribuinte = old_id;

  -- 2. Ativo recebe old_id (DW)
  UPDATE contribuinte SET id = old_id WHERE id = new_id;
  UPDATE inscricao_contribuinte SET contribuinte_id = old_id WHERE contribuinte_id = new_id;

  -- 3. Temp (antigo) recebe new_id
  UPDATE contribuinte SET id = new_id WHERE id = temp_id;
  UPDATE contribuinte_bal_config SET id_contribuinte = new_id WHERE id_contribuinte = temp_id;
END $$;
```

### Resultado final

| Registro | UUID novo | Estado |
|---|---|---|
| Contribuinte ativo (cliente ativo) | `b0d3712c` ← DW | ✅ Correto |
| Contribuinte antigo (cliente excluído) | `e3291d4f` | Descartável |

### Execução
Uma única migração via migration tool. Nenhuma alteração de código.

