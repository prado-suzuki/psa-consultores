

## Plano: Normalização de Nomes para Title Case

### Diagnóstico Atual

| Tabela | Total | CAIXA ALTA | caixa baixa | Misto |
|--------|-------|-----------|-------------|-------|
| cliente | 48 | 3 | 0 | 45 |
| cliente_dev | 45 | 3 | 0 | 42 |
| contribuinte | 137 | 93 | 1 | 43 |
| contribuinte_dev | 110 | 88 | 0 | 22 |

Contribuintes são os mais afetados — 68% em CAIXA ALTA (ex: `AGROPECUARIA BOM PASTOR LTDA`).

### Plano de Ação

#### Etapa 1 — Correção dos dados existentes (4 UPDATEs via insert tool)

Usar `initcap()` do PostgreSQL nas 4 tabelas:

```sql
-- cliente
UPDATE cliente SET nome = initcap(nome) WHERE excluido = false AND nome IS NOT NULL;

-- cliente_dev
UPDATE cliente_dev SET nome = initcap(nome) WHERE excluido = false AND nome IS NOT NULL;

-- contribuinte (nome_razao_social + nome_fantasia)
UPDATE contribuinte SET
  nome_razao_social = initcap(nome_razao_social),
  nome_fantasia = initcap(nome_fantasia)
WHERE excluido = false;

-- contribuinte_dev
UPDATE contribuinte_dev SET
  nome_razao_social = initcap(nome_razao_social),
  nome_fantasia = initcap(nome_fantasia)
WHERE excluido = false;
```

**Nota:** `initcap()` converte `AGROPECUARIA BOM PASTOR LTDA` → `Agropecuaria Bom Pastor Ltda`. Abreviações como LTDA, EIRELI, S/A ficam em Title Case — aceitável para padronização visual.

#### Etapa 2 — Prevenção no frontend (NewClientModal.tsx)

Criar uma função utilitária `toTitleCase()` e aplicá-la nos pontos de salvamento para que novos cadastros e edições já entrem normalizados:

- **`clientData.nome`** — ao salvar cliente
- **`draftEntity.nome_razao_social`** e **`nome_fantasia`** — ao adicionar contribuinte
- **`draftParticipant.nome`** — ao adicionar participante

Locais de alteração:
- `src/components/equipe/fiscal/NewClientModal.tsx` — funções `executeSave()`, `addEntity()`, `addParticipant()`
- `src/pages/equipe/dev/GerenciarDados.tsx` — mapeamento CSV de participantes

#### Etapa 3 — Trigger de banco (migração SQL, opcional mas recomendado)

Criar um trigger `BEFORE INSERT OR UPDATE` nas 4 tabelas para garantir normalização mesmo via importações diretas ou APIs:

```sql
CREATE FUNCTION normalize_name_title_case() RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME IN ('cliente', 'cliente_dev') THEN
    NEW.nome := initcap(NEW.nome);
  ELSE
    NEW.nome_razao_social := initcap(NEW.nome_razao_social);
    NEW.nome_fantasia := initcap(NEW.nome_fantasia);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Isso torna a normalização à prova de falhas independente do ponto de entrada dos dados.

### Resumo de Alterações

| Tipo | Escopo | Arquivos/Tabelas |
|------|--------|-----------------|
| Dados | UPDATE em 4 tabelas | cliente, cliente_dev, contribuinte, contribuinte_dev |
| Frontend | Normalização no save | NewClientModal.tsx, GerenciarDados.tsx |
| Banco | Trigger preventivo | 4 tabelas (migração SQL) |

