

## Plano: Ajustes no Mapa NCM — Tabela e Modal

### 1. Tabela Principal (`MapaNCMPisCofins.tsx`)

**Coluna Setor:** Linha 151 — trocar `?.sigla` por `?.nome` para exibir o nome completo do segmento.

### 2. Modal (`RegraFormSheet.tsx`)

**Schema Zod:** Remover validação obrigatória de `desc_cst` — mudar para `z.string().optional()` (linha 87), pois será preenchido automaticamente.

**Remover campo Descrição CST do formulário:** Deletar o bloco `FormField` de `desc_cst` (linhas 357-413) e os estados `descOpen`/`descSearch` (linhas 204-205).

**Reorganizar layout do formulário:**
- Após a linha de NCM + Setor, colocar "Permite Crédito" e "Tipo de Crédito" na segunda linha (grid-cols-2)
- Terceira linha: "CST PIS/COFINS" ocupando largura total (sem grid), com o Combobox que já exibe código + descrição

**Lógica de submissão:** No `handleFormSubmit`, extrair a descrição do CST selecionado a partir de `CST_OPTIONS` e injetá-la no payload:
```typescript
const cstOpt = CST_OPTIONS.find(o => o.code === values.cst_pis);
onSubmit({ ...values, cst_cofins: values.cst_pis, desc_cst: cstOpt?.description ?? '' });
```

**View mode:** Remover o `DetailField` de "Descrição CST" (linha 290), pois a descrição já é visível no CST.

### Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `MapaNCMPisCofins.tsx` | Coluna setor: `sigla` → `nome` |
| `RegraFormSheet.tsx` | Remover campo desc_cst, reorganizar layout, auto-preencher desc_cst no submit |

