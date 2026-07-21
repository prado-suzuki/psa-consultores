# Instruções de orquestração (opencode) — Fase 1 (cauda longa do T4)

> **Para o AGENTE PRINCIPAL do opencode.** Você vai coordenar **subagentes paralelos** para mover
> chamadas `supabase.from/rpc` de `src/pages`/`src/components` para hooks React Query.
> Branch de trabalho: **`feature/refatoracao-camada-dados`** (já criada). Não crie outra.
> Leia antes: `docs/geral/refatoracao-camada-dados-ledger.md` (a lista-mestre e o status).

---

## Regra de ouro da paralelização

**DOIS SUBAGENTES NUNCA PODEM EDITAR O MESMO ARQUIVO.** Toda colisão vira conflito.
Você particiona o trabalho em **ondas**; dentro de uma onda, cada subagente é **dono exclusivo** de um
conjunto **disjunto** de arquivos. Arquivo compartilhado (hook de cluster) é criado numa onda anterior,
e os consumidores só o **importam** (nunca o editam) nas ondas seguintes.

**Barreira entre ondas:** só dispare a onda N+1 depois que TODOS os subagentes da onda N terminarem e o
`typecheck`/`build` passar. Não sobreponha ondas.

---

## Regras invioláveis (copie no prompt de CADA subagente)

1. **Preservar comportamento — refactor puro.** Mover a query/mutation para um hook, sem mudar o que ela faz.
   Mesmas tabelas, mesmas colunas, mesma ordem, mesmos filtros. `/verify` deve mostrar comportamento idêntico.
2. **NÃO adicionar auditoria.** Decisão do dono: as mutations continuam SEM `useAuditLog` (gap pré-existente).
   Em vez disso, **acrescente** uma linha em `docs/geral/auditoria-gaps-cud.md` para cada mutation movida
   (só append — nunca remova linhas desse arquivo).
3. **Preservar filtros de tenancy/soft-delete.** Nunca dropar `.eq('ambiente', …)`, `.eq('excluido', false)`,
   `.eq('ativo', …)`. Perder um deles = vazamento entre ambientes. (Ex.: `ControlePerdcomp.tsx:142`.)
4. **Reusar hooks existentes** (`useCorrecoesSped.ts`, `useAuditLog.ts`, etc.) antes de criar novos.
5. **NÃO editar arquivos autogerados:** `src/integrations/supabase/*`, `components.json`, `supabase/config.toml`.
   Para conferir colunas/tabelas, leia `docs/rls/mapa-do-banco.md` — **nunca** `types.ts` inteiro.
6. **Padrão de hook:** `src/hooks/useDomain*.ts`, React Query (`useQuery`/`useMutation`), TypeScript, alias `@/`.
   Query keys estáveis; invalidar as keys certas no `onSuccess` das mutations (espelhar o refetch atual).
7. **Sem `alert/confirm/prompt`.** Feedback via `useToast`/`sonner` (preservar os toasts já existentes).
8. **Escopo travado:** editar SOMENTE os arquivos designados ao subagente + o(s) hook(s) dele. Nada além.

---

## Fluxo de cada subagente

1. Ler apenas os arquivos designados + o ledger + `docs/rls/mapa-do-banco.md` se precisar de schema.
2. Criar/estender o hook e trocar as chamadas diretas por consumo do hook.
3. Rodar `npm run typecheck` (ou `tsc --noEmit`) e garantir 0 erros nos arquivos tocados.
4. Se houver mutation: acrescentar linha(s) em `docs/geral/auditoria-gaps-cud.md`.
5. Reportar ao principal: arquivos alterados, hook criado, e "grep limpo" (`git grep supabase.from` nos seus arquivos = 0).

O **agente principal** roda `build` + `/verify` após cada onda e atualiza o Status no ledger.

---

## Ondas (partição sem colisão)

### 🌊 Onda 0 — Infra compartilhada (SERIAL, 1 subagente por item, ANTES de tudo)
Cria os hooks que várias telas vão importar. Nada aqui roda em paralelo com seus consumidores.

- **0a. `useProfilesNomeMap()`** — lookup `id → "Nome Sobrenome"` repetido em ~9 telas.
  ⚠️ Preservar a fonte de cada caller: alguns usam `profiles`, outros `profiles_safe`.
  Assinatura sugerida: `useProfilesNomeMap(source: 'profiles' | 'profiles_safe' = 'profiles_safe')`.
- **0b. Estender `useCorrecoesSped.ts`** — mutations do cluster correcoes-sped (`efd_correcoes`: update/insert/delete).
- **0c. Criar hook de domínio perdcomp** (ex.: `usePerdcompMutations.ts`) — `per`/`per_situacao`/`dcomp`/`distribuicao_dcomp`.

### 🌊 Onda 1 — Consumidores do profiles-map (PARALELO, 1 arquivo por subagente)
Cada um só troca o select local por `useProfilesNomeMap(...)`. Arquivos disjuntos → seguro em paralelo:
`DesempenhoCiclos`, `DesempenhoFeedbacks`, `DesempenhoMetas`, `DesempenhoRelatorios`, `DesempenhoVisaoGeral`,
`MinhaEvolucao`, `DesempenhoReunioes1a1`, `DesempenhoEvolucao`, `HistoricoTab`, `HistoricoFlutuante`, `AuditLogTable`.
> `DesempenhoEvolucao`/`Reunioes1a1`/`AuditLogTable`/`HistoricoTab` têm queries extras (`metas`, `itens_acao_1a1`,
> `audit_logs`) — o mesmo subagente extrai essas também, para um `useDomain*` próprio do arquivo.

### 🌊 Onda 2 — Consumidores dos hooks de cluster (PARALELO por CLUSTER, serial dentro do cluster)
Arquivos do mesmo cluster tocam o MESMO hook → **um subagente por cluster inteiro** (não um por arquivo):
- **Subagente correcoes-sped:** `CorrecoesActionButtons`, `TabD100`, `TabF100`, `TabF120`, `TabF130` (usa 0b).
- **Subagente perdcomp-cauda:** `CargaPerdcompCSV`, `PerFormModal`, `SituacaoFormModal` (usa 0c).

### 🌊 Onda 3 — Telas independentes com hook próprio (PARALELO, 1 arquivo por subagente)
Sem compartilhamento → totalmente paralelo:
`ContactSection`, `EquipeNovaTarefa`, `EquipeRotinas`, `EquipeSprints`, `EquipeControleAcessos`,
`GestaoNovidades`, `DesempenhoDecisoes`, `EquipeBacklog`, `EquipeTarefas`, `BoardDashboard`.

> **`constants.ts`** (não é componente): decidir à parte — mover para `useOrdemServicoNumero` ou `src/lib`.
> **Testes `.test.tsx`**: exceção, não tocar (comentar exceção se necessário).

**Fora da Fase 1:** os 9 god-components (Fase 2 do ledger) NÃO entram no fan-out — são 1 arquivo/sessão
com `/verify` + `/code-review`, feitos depois e à parte.

---

## Template de prompt por subagente

```
Você é um subagente de refatoração no repo psa-consultores, branch feature/refatoracao-camada-dados.
TAREFA: mover as chamadas supabase.from/rpc dos arquivos [LISTA] para hook(s) React Query.

ARQUIVOS QUE VOCÊ PODE EDITAR (e SÓ estes):
- [arquivo(s)-alvo]
- [hook a criar/editar]

SIGA À RISCA (docs/geral/refatoracao-camada-dados-INSTRUCOES-opencode.md, "Regras invioláveis"):
- Refactor puro: mesmo comportamento, mesmos filtros (ambiente/excluido/ativo), mesmos toasts.
- NÃO adicionar useAuditLog. Se mover mutation, acrescente linha em docs/geral/auditoria-gaps-cud.md.
- Não editar src/integrations/supabase/*. Schema → docs/rls/mapa-do-banco.md, nunca types.ts.
- Reusar hook existente quando indicado na onda.

AO TERMINAR:
1. `git grep -nE 'supabase\.(from|rpc)'` nos seus arquivos = 0.
2. typecheck sem erros novos.
3. Reporte: arquivos alterados, hook criado/estendido, linhas adicionadas ao gaps-cud (se houver).
```

---

## Checklist do agente principal

- [ ] Confirmar branch `feature/refatoracao-camada-dados`.
- [ ] Onda 0 (serial) → typecheck/build ok.
- [ ] Onda 1 (paralelo) → barreira → build + `/verify` → atualizar ledger.
- [ ] Onda 2 (paralelo por cluster) → barreira → build + `/verify` → ledger.
- [ ] Onda 3 (paralelo) → barreira → build + `/verify` → ledger.
- [ ] `git grep -nE 'supabase\.(from|rpc)' -- src/pages src/components` só retorna testes/exceções comentadas.
- [ ] Commit por onda (ou por cluster), mensagem clara. NÃO abrir PR sem revisão humana.
