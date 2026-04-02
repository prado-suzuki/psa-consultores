

## Auditoria Granular: changed_fields com diff campo-a-campo

### Diagnóstico

**Dados originais disponíveis?** Não diretamente. O `useClientEditData` carrega os dados do banco e injeta nos mesmos states (`setClientData`, `setEntities`, etc.) que o usuário depois edita. Não há snapshot separado dos valores originais.

**Formato de `changed_fields`:** JSONB na tabela `audit_logs`. Formato esperado pelo `formatChangedFields`: `Record<string, { old: unknown; new: unknown }>`. O `HistoricoTab` já renderiza isso corretamente com old em vermelho riscado e new em verde.

**`auditFieldFormatter`:** Já traduz nomes de campos (FIELD_LABELS), resolve UUIDs via lookups, formata datas e enums. Precisa apenas adicionar labels para campos de cadastro de clientes (nome, categoria, ativo, telefone, etc.).

---

### Plano de Implementação

#### 1. `src/hooks/useClientEditData.ts` — Capturar snapshot original

Após carregar os dados do banco, além de chamar os setters, armazenar uma cópia profunda (deep clone) dos dados originais num ref/state separado e retorná-lo:

```typescript
// Novo retorno:
return { loadingEdit, originalSnapshot };
// originalSnapshot = { clientData, entities, participants, contracts, inscricoesMap }
```

Usar `structuredClone()` ou `JSON.parse(JSON.stringify())` para garantir cópia independente. Retornar `null` quando não está editando.

#### 2. `src/lib/diffUtils.ts` — Novo arquivo: utilitário de diff genérico

Função pura `computeFieldDiff(oldObj, newObj, fieldsToCompare)`:
- Compara campo a campo
- Retorna `Record<string, { old: unknown; new: unknown }>` apenas com campos que mudaram
- Para criação (old = null): todos os campos com valor vão como `{ old: null, new: valor }`
- Ignora campos internos (`_id`, `_dbId`)

Função `computeEntityListDiff(oldList, newList, idField)`:
- Identifica entidades adicionadas, removidas e modificadas
- Retorna diffs individuais por entidade

#### 3. `src/hooks/useSaveClientTransaction.ts` — Integrar diff no logAction

**Novo parâmetro** em `SaveTransactionParams`:
```typescript
originalSnapshot?: { clientData, entities, participants, contracts } | null;
```

**No bloco de audit logs (linhas 420-472):**

- **Cliente:** `computeFieldDiff(originalSnapshot.clientData, clientData, ['nome','categoria','ativo','fixo','telefone','municipio','uf','setor_cliente','regiao'])`
- **Contribuintes:** Para cada entity com `_dbId`, encontrar o original pelo `_dbId` e computar diff. Sem `_dbId` = criação (old: null).
- **Representantes:** Mesmo padrão — match por `_dbId`, diff campo a campo.
- **Ordens de Serviço:** Mesmo padrão.
- **Soft-deletes:** Registrar `action: 'deleted'` para entidades removidas (já identificadas pelos arrays `removedContribIds`, `removedPartIds`, `removedOsIds`), incluindo `entity_name` do snapshot original.

Passar `changed_fields` no `logAction` apenas se houver campos alterados (skip se diff vazio).

#### 4. `src/components/equipe/NewClientModal.tsx` — Passar snapshot ao save hook

Receber `originalSnapshot` do `useClientEditData` e passá-lo no params do `useSaveClientTransaction`.

#### 5. `src/components/equipe/audit/auditFieldFormatter.ts` — Adicionar labels de cadastro

Adicionar ao `FIELD_LABELS`:
```typescript
nome: 'Nome',
categoria: 'Categoria',
ativo: 'Ativo',
fixo: 'Fixo',
telefone: 'Telefone',
municipio: 'Município',
uf: 'UF',
setor_cliente: 'Área do Negócio',
regiao: 'Região',
cpf_cnpj: 'CPF/CNPJ',
nome_razao_social: 'Razão Social',
nome_fantasia: 'Nome Fantasia',
inscricao_estadual: 'Inscrição Estadual',
cod_cnae: 'CNAE',
simples_nacional: 'Simples Nacional',
cargo: 'Cargo',
email: 'E-mail',
acesso_chamados: 'Acesso a Chamados',
numero_os: 'Número OS',
valor_projeto: 'Valor do Projeto',
situacao_projeto: 'Situação',
data_emissao: 'Data de Emissão',
data_inicio_projeto: 'Data Início',
data_fim_projeto: 'Data Fim',
```

Adicionar `ativo` e `acesso_chamados` ao `BOOLEAN_FIELDS`.

---

### Arquivos alterados

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `src/lib/diffUtils.ts` | **Novo** — funções `computeFieldDiff` e `computeEntityListDiff` |
| 2 | `src/hooks/useClientEditData.ts` | Retornar `originalSnapshot` com cópia profunda dos dados carregados |
| 3 | `src/hooks/useSaveClientTransaction.ts` | Receber snapshot, computar diffs, passar `changed_fields` no `logAction` |
| 4 | `src/components/equipe/NewClientModal.tsx` | Passar `originalSnapshot` do edit hook ao save hook |
| 5 | `src/components/equipe/audit/auditFieldFormatter.ts` | Adicionar FIELD_LABELS e BOOLEAN_FIELDS para campos de cadastro |

**Total: 4 arquivos alterados, 1 arquivo criado.**

