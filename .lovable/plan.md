## Objetivo
Corrigir o falso "Nenhuma alteração detectada" quando o único diff está em `distribuicao_receita` ou `os_produtos_contratados`, e passar a auditar essas mudanças de forma legível no HistoricoTab / AuditLogTable / HistoricoFlutuante.

Escopo: `src/hooks/useSaveClientTransaction.ts` + adição de 2 labels em `src/components/equipe/audit/auditFieldFormatter.ts`. Nada de policy/banco/outros hooks.

## Alterações

### 1. Contagem de writes por OS (em `useSaveClientTransaction.ts`)
No loop `for (const c of contracts)` (~L490), acumular `osChangeStats: Map<osId, { osLabel, rateio, produtos }>` com contadores e listas resumo.

Pontos de contagem — **só conta o que realmente mudou**:
- `distRemovidos.length` → `rateio.softDeleted` (+ registrar centro de custo de cada removido para o resumo "antes").
- Loop de update do rateio (L566-L580): **só incrementa `rateio.updated` quando `id_centro_custo` ou `percentual_rateio` diferem do que está no banco** (checar contra `dbDist` — hoje o SELECT em L548 traz só `id`; ampliar para `id, id_centro_custo, percentual_rateio` e comparar). Isso é requisito do GATE 3/4: sem essa checagem, todo save com OS acusaria mudança fantasma.
- `distNovos.length` → `rateio.inserted` (+ centros adicionados).
- Snapshot "antes" e "depois" do rateio (lista `{centro_custo_codigo, percentual}`) — usar `dbDist` e `draftDist`. Resolver o rótulo do centro de custo pelo `centros_custo` já carregado no formulário (via prop/context existente). Fallback: id truncado.
- Produtos: `toDelete.length` → `deleted` (+ produto_segmento_id removidos); `toInsert.length` → `inserted` (+ adicionados); loop de update (L649-L664): `updated` só dentro do `if (prodChanged || horasChanged)`.
- Snapshot "antes/depois" de produtos: lista `{codigo/sigla, horas}` a partir do `existingMap`/`existingProdutos` e do `draftProdutos`. Resolver rótulo do produto pelo catálogo já carregado no form.

### 2. Emitir 1 audit por OS afetada — no formato que a UI já lê
Após o bloco de audits de OS (~L809), percorrer `osChangeStats`. Para cada OS com `rateio.(inserted+updated+softDeleted) > 0` OU `produtos.(inserted+updated+deleted) > 0`, emitir:

```ts
logAction({
  area: 'dev',
  entity_type: 'ordem_servico',
  entity_id: osId,
  entity_name: osLabel,
  action: 'updated',
  details: `Cliente: ${clientData.nome.trim()}`,
  changed_fields: {
    ...(rateioChanged && {
      distribuicao_receita: { old: resumoRateioAntes, new: resumoRateioDepois },
    }),
    ...(produtosChanged && {
      produtos_contratados: { old: resumoProdutosAntes, new: resumoProdutosDepois },
    }),
  }
});
```

- Cada resumo é **string legível baseada em conteúdo** (não só contagem), no formato `"CC-0007 60%, CC-0012 40%"` para rateio e `"PIS-COFINS 100h, ICMS 50h"` para produtos. Ordenar de forma estável (por código) para que a igualdade textual entre `old` e `new` só ocorra quando o conteúdo é idêntico — o formatter descarta a entrada quando `old === new` após formatação, então trocar de centro mantendo total precisa refletir na string.
- **Só incluir a chave do lado que realmente mudou.** Se só o rateio mudou, `produtos_contratados` não entra no objeto.
- Detalhe opcional (ex.: "3 linhas antes → 1 linha depois") pode ir em `details`.

Remover os `logAction` inline por-item de produtos hoje em L612-L622 e L636-L645 para não duplicar com o consolidado.

### 3. Ajustar `nothingChanged` (~L836)
```ts
const anyRateioOrProdChange = Array.from(osChangeStats.values()).some(s =>
  s.rateio.inserted + s.rateio.updated + s.rateio.softDeleted +
  s.produtos.inserted + s.produtos.updated + s.produtos.deleted > 0
);

const nothingChanged =
  isEditing && !clientHasChange &&
  contribDiffs.length === 0 && partDiffs.length === 0 && osDiffs.length === 0 &&
  !anyRateioOrProdChange;
```
Textos dos toasts permanecem idênticos.

### 4. Labels na UI (`src/components/equipe/audit/auditFieldFormatter.ts`)
Adicionar ao `FIELD_LABELS`:
```ts
distribuicao_receita: 'Distribuição de receita',
produtos_contratados: 'Produtos contratados',
```
Sem essas entradas o HistoricoTab/AuditLogTable/HistoricoFlutuante mostraria os nomes crus das colunas.

## Fora de escopo
Policies, schema, outros hooks, refatoração de `computeFieldDiff`, unificação dos audits de OS pré-existentes (osFields continua emitindo seu próprio log).

## GATE
1. Admin altera só o rateio de uma OS → toast de sucesso; `audit_logs` recebe `ordem_servico/updated` com `changed_fields.distribuicao_receita = { old, new }` como strings distintas.
2. Admin altera só produtos contratados → mesmo, com `changed_fields.produtos_contratados`.
3. Trocar um centro de custo mantendo a mesma quantidade de linhas e o mesmo total → o audit aparece com `old` e `new` diferentes (resumo por conteúdo, não por contagem).
4. Abrir cliente com OS e salvar sem mexer em nada → nenhum audit novo é gravado e o toast "Nenhuma alteração detectada" continua aparecendo.
5. Na aba **Histórico** do cliente, a mudança de rateio aparece com o rótulo "Distribuição de receita" e o antes/depois legíveis, não como "updated" vazio.
