# Rateio de Tributos no DCOMP (PERDCOMP)

Substituir o campo único de `imposto` por uma lista dinâmica de tributos rateados, persistida em nova tabela `distribuicao_dcomp`, com validação de que a soma dos rateios bate com o `vlr_compensado` do DCOMP.

## 1. Banco de dados (migration)

Criar tabela `public.distribuicao_dcomp`:

- `id` uuid PK default `gen_random_uuid()`
- `nr_documento` varchar NOT NULL → FK `dcomp(nr_documento) ON DELETE CASCADE`
- `tributo` varchar NOT NULL (PIS, COFINS, IPI, INSS, IRRF, IRPJ, CSLL, CSRF)
- `valor_tributo` numeric(18,2) NOT NULL DEFAULT 0
- `criado_em` / `atualizado_em` timestamptz com trigger `update_atualizado_em_column`
- Índice em `nr_documento`
- **Sem soft-delete** (conforme pedido)

RLS: habilitar e replicar a mesma política da tabela `dcomp` (acesso por `has_role_or_higher(auth.uid(),'team_member')`). Vou inspecionar as policies de `dcomp` e espelhar.

> Observação: a coluna `imposto` da tabela `dcomp` permanece (legado/sync DW). Será preenchida com o tributo de **maior valor** do rateio (representativo) para não quebrar `syncPerdcompToDW` nem relatórios existentes.

## 2. Frontend — `DcompFormModal.tsx`

### Estado
Adicionar ao form um array:
```ts
distribuicoes: { id?: string; tributo: string; valor_tributo: number }[]
```
(linhas locais usam `crypto.randomUUID()` até o save).

### UI (substitui o atual SelectField "Imposto")
Abaixo de **Valor Compensado (R$)**:

```
[ + Adicionar Tributo ]   ← botão outline

┌─ por linha ────────────────────────────────────────────┐
│ <Select tributo>   <Input R$ valor>   <Button trash>  │
└────────────────────────────────────────────────────────┘

Total rateado: R$ X,XX  / Compensado: R$ Y,YY   ✓ ou ✗
```

- Clique em **+ Adicionar Tributo** abre um Select inline; ao escolher, insere linha com `valor_tributo: 0`.
- Cada linha tem Select editável (mesma lista PIS/COFINS/IPI/INSS/IRRF/IRPJ/CSLL/CSRF) + Input monetário (mesma máscara `formatCurrencyDisplay`/`parseCurrencyToNumber`) + botão excluir.
- Footer mostra soma calculada em tempo real e badge verde/vermelha.

### Validação
- `dcompSchema` deixa de exigir `imposto` no nível raiz; valida `distribuicoes.length >= 1`.
- Validação extra (fora do zod, no `onSubmit` + `disabled` do botão Salvar):
  - **Bloqueia Salvar quando `Σ valor_tributo !== vlr_compensado`** (igualdade exata, comparada em centavos para evitar erro de float).
- Mensagem em vermelho acima do `DialogFooter`:
  *"A soma dos tributos (R$ X) deve ser igual ao valor total compensado (R$ Y)."*

### Carregamento (modo edição)
- Nova query `useQuery(['dcomp-distribuicoes', editData.nr_documento])` busca linhas de `distribuicao_dcomp`.
- `useEffect` que hidrata `editData` também popula `form.setValue('distribuicoes', ...)`.

### Persistência (create + update mutations)
Após `insert`/`update` em `dcomp`:
1. `delete` em `distribuicao_dcomp where nr_documento = X` (rateio é totalmente substituído a cada save — não há referência cruzada que justifique upsert seletivo, e a tabela não tem soft-delete).
2. `insert` no array novo.
3. Atualiza `dcomp.imposto` e `dcomp.tp_credito` com o tributo de maior valor (compatibilidade DW).
4. Invalida queries: `perdcomp-dcomp`, `per-dcomps`, `dcomp-distribuicoes`, `per-detail`, `per-situacoes`.
5. `syncPerdcompToDW` continua sendo chamado com o registro `dcomp` (sem mudar contrato do edge function nesta etapa).

### useAuditLog
Registrar `entity_type:'dcomp'`, `action:'updated'|'created'`, `changed_fields` incluindo `distribuicoes` (JSON serializado) via `computeFieldDiff`.

## 3. Tela `ControlePerdcomp.tsx`

- Coluna/badge "Imposto" passa a renderizar **lista de tributos** quando há rateio (join com `distribuicao_dcomp`). Se houver só 1, mostra como hoje.
- Detalhe expandido do DCOMP exibe tabelinha com tributo + valor.
- (Resto da tela permanece — sem mudanças em filtros/exports nesta etapa.)

## 4. Verificação
1. Criar DCOMP novo com 3 tributos somando ≠ vlr_compensado → botão Salvar desabilitado + mensagem vermelha.
2. Ajustar para somar = vlr_compensado → salva, gera N linhas em `distribuicao_dcomp`.
3. Reabrir em edição → linhas carregadas; remover uma → soma quebra → Salvar bloqueado.
4. Conferir audit log e `dcomp.imposto` populado com tributo dominante.

## Fora de escopo
- Mudanças no edge function `sync-perdcomp` / DW schema (continua recebendo `imposto` único).
- Migração de DCOMPs existentes para popular `distribuicao_dcomp` (cada registro antigo continua válido com 1 linha implícita = `imposto`/`vlr_compensado`; pode ser feito num backfill posterior se desejar).
