

## Plano: Realocar campos e múltiplas IEs no cadastro de cliente

### Etapa 1 — Migration: nova coluna JSONB para múltiplas IEs

Adicionar coluna `inscricoes_estaduais` (JSONB, default `'[]'`) em ambas as tabelas:

```sql
ALTER TABLE public.contribuinte
ADD COLUMN inscricoes_estaduais jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.contribuinte_dev
ADD COLUMN inscricoes_estaduais jsonb DEFAULT '[]'::jsonb;
```

### Etapa 2 — Data update: migrar dados existentes

Converter o valor atual de `inscricao_estadual` + `uf` para o novo formato JSONB nos registros que possuem IE:

```sql
UPDATE public.contribuinte
SET inscricoes_estaduais = jsonb_build_array(jsonb_build_object('ie', inscricao_estadual, 'uf', COALESCE(uf, '')))
WHERE situacao_inscricao_estadual = 'sim' AND inscricao_estadual IS NOT NULL AND inscricao_estadual != '';

UPDATE public.contribuinte_dev
SET inscricoes_estaduais = jsonb_build_array(jsonb_build_object('ie', inscricao_estadual, 'uf', COALESCE(uf, '')))
WHERE situacao_inscricao_estadual = 'sim' AND inscricao_estadual IS NOT NULL AND inscricao_estadual != '';
```

As colunas `inscricao_estadual` e `situacao_inscricao_estadual` permanecem (backward compat). Não serão removidas.

### Etapa 3 — Frontend: NewClientModal.tsx

**3a. Mover campos para aba OS:**
- Remover "Tipo de produto/segmento" e "Empresa / Faturamento" da aba "Dados do Cliente" (~linhas 1728-1826)
- Adicionar ambos no topo da aba "OS", antes do bloco de ordens de serviço existente
- A lógica de estado (`clientData.tipo_produto_segmento`, `clientData.empresa_faturamento`) permanece no mesmo objeto — muda apenas onde é renderizado
- Validação no save permanece igual

**3b. Alterar DraftEntity para múltiplas IEs:**
- Adicionar campo `inscricoes_estaduais: Array<{ie: string, uf: string}>` na interface `DraftEntity`
- Manter `situacao_inscricao_estadual` (sim/não/isento) como controle de se o contribuinte possui IEs

**3c. UI das IEs — formulário de novo contribuinte e edição inline:**
- Quando `situacao_inscricao_estadual === "sim"`, mostrar lista de linhas IE/UF:
  - Cada linha: `Input` (nº IE) + `Select` (UF, 27 estados) + botão `X` para remover
  - Botão `+ Adicionar IE` abaixo da lista para nova linha
- Na view colapsada (FieldPair), exibir as IEs como badges: `"123456 (MT), 789012 (SP)"`

**3d. Persistência:**
- No `buildContribFields`: serializar `inscricoes_estaduais` como JSONB
- Manter `inscricao_estadual` preenchida com a primeira IE (backward compat)
- No `loadData`: ler `inscricoes_estaduais` do banco; fallback para `inscricao_estadual` se array vazio

### O que NÃO será feito
- Nenhuma remoção de colunas antigas
- Nenhuma alteração de RLS
- Nenhuma alteração em outras tabelas

