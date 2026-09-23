# Tarefas de estruturação do repo — redução de custo de IA (Claude Code)

**Autor:** BI / diagnóstico assistido
**Data:** 2026-07-13
**Responsável de execução:** Engenharia de Dados (com apoio do time de frontend nos itens marcados)

## Por que esta lista existe

Comparando este repo com outro projeto interno (Radiant_agro), o Claude Code consome
muito mais crédito aqui. O diagnóstico mostrou que **a causa não é a documentação** (nosso
`CLAUDE.md` e `docs/` são bons) — é a **estrutura do código**:

| Métrica | psa-consultores | Radiant_agro (referência) |
|---|---|---|
| Arquivos versionados | 1.333 | 512 |
| Linhas TS/TSX | 182.343 | 31.731 |
| Linhas SQL | 58.869 | 1.438 |
| Arquivos de código > 800 linhas | 31 | 3 |
| Maior arquivo | `types.ts` 8.932 / página 2.724 | 991 |

**Mecanismo do custo:** o Claude cobra quase tudo em *token de entrada (contexto)*, e o
contexto é **reenviado a cada turno**. Então cada arquivo grande que ele lê fica "pesando"
até o fim da sessão. Ler um componente de 2.700 linhas = ~30k tokens que se acumulam.
Reduzir tamanho de arquivo, mover dados para hooks e dar ao Claude um "mapa" pronto do banco
corta esse custo de forma permanente.

As tarefas abaixo são, todas, **boas práticas de engenharia** — a economia de crédito é um
efeito colateral de deixar o repo mais são.

> **Total: 7 tarefas** — Prioridade 1 (3), Prioridade 2 (1), Prioridade 3 (3).

---

## 🔴 Prioridade 1 — Camada de dados (maior ROI, domínio direto do eng. de dados)

### T1 — Criar o "Mapa do Banco" (schema legível) ✅ FEITO (2026-07-13)
- [x] **Problema:** `src/integrations/supabase/types.ts` tem **8.932 linhas** (~80k tokens).
  Sempre que o Claude precisa conferir uma coluna, ele tende a ler esse arquivo inteiro —
  um golpe enorme no orçamento. Antes **não existia** doc de schema em `docs/`.
- [x] **Feito:** gerado `docs/rls/mapa-do-banco.md` (837 linhas) com índice + detalhe das
  **133 tabelas** (colunas, tipos, flags `ambiente`/`excluido`, FKs) + **25 enums** + funções
  `SECURITY DEFINER`. Gerado por `scripts/gen-mapa-banco.mjs` (versionado, reproduzível).
- [x] **Não** editei `types.ts` — o mapa é derivado, ele continua a fonte autogerada.
- [x] **Aceite:** responde "quais colunas da tabela X / o que referencia" lendo só o mapa. ✔
- [ ] **Manutenção:** rodar `node scripts/gen-mapa-banco.mjs` sempre que o schema mudar.
- **Esforço:** M · **Impacto no custo:** 🔥 Alto · **Status:** concluída

### T2 — Arquivar/avaliar as migrations de import legado
- [ ] **Problema:** duas migrations somam **26.916 linhas** de SQL e são varridas em buscas:
  - `supabase/migrations/20260429120000_import_legacy_tickets.sql` (13.458)
  - `supabase/migrations/20260429130000_import_legacy_tickets_retry.sql` (13.458)
  Provável duplicação (uma é o `_retry` da outra).
- [ ] **Fazer:** confirmar se a `_retry` supersede a original; avaliar consolidar o histórico
  de migrations num *baseline* (squash) ou marcar esses arquivos como gerados/dados-apenas
  para saírem do ruído de busca. **Não apagar migration já aplicada sem validar o baseline.**
- [ ] **Aceite:** decisão registrada (manter/arquivar/squash) e, se arquivado, ~27k linhas de
  SQL saem do caminho de busca padrão.
- **Esforço:** M · **Impacto no custo:** 🔥 Alto · ⚠️ requer cuidado (migrations aplicadas)

### T3 — Registrar a regra de consulta ao schema ✅ FEITO (2026-07-13)
- [x] **Feito:** regra adicionada em 3 pontos:
  - `CLAUDE.md` → REGRAS INEGOCIÁVEIS (proibição de ler `types.ts` inteiro).
  - `CLAUDE.md` → REVELAÇÃO PROGRESSIVA (ponteiro para o mapa + comando de regeneração).
  - `docs/AI_CONTEXT.md` → nota na linha do `types.ts`.
- [x] **Aceite:** regra presente e apontando para `docs/rls/mapa-do-banco.md` (T1). ✔
- **Esforço:** P · **Impacto no custo:** 🔥 Alto · **Status:** concluída

---

## 🟠 Prioridade 2 — Aderência às regras (corta custo e dívida técnica juntos)

### T4 — Mover chamadas diretas ao Supabase para hooks
- [ ] **Problema:** **42 arquivos** em `src/pages`/`src/components` chamam `supabase.from`/
  `supabase.rpc` direto — viola a regra nº 1 do `CLAUDE.md` e engorda os componentes
  (mais linhas = mais tokens por leitura).
- [ ] **Fazer:** extrair essas queries/mutations para `src/hooks/useDomain*.ts` (React Query),
  seguindo o padrão do repo. Priorizar os que também estão na lista de god-components (T5/T6):
  `EquipeKanban.tsx`, `EquipeDemandas.tsx`, `perdcomp/*`, `correcoes-sped/*`.
- [ ] **Aceite:** `git grep "supabase\.from\|supabase\.rpc" -- src/pages src/components`
  retorna 0 (ou só exceções justificadas com comentário).
- **Esforço:** G · **Impacto no custo:** 🟧 Médio-alto · alinhado à regra nº 1

---

## 🟡 Prioridade 3 — Refatoração dos arquivos gigantes

### T5 — Extrair a lógica de dados dos god-components (eng. de dados)
- [ ] **Fazer:** nos 30 componentes > 800 linhas (Apêndice A), tirar toda lógica de dados
  (queries, transformações, cálculos fiscais) para hooks/`src/lib`. Isso já resolve boa
  parte do T4 e reduz o tamanho dos arquivos.
- [ ] **Aceite:** componente sem acesso a dados; lógica testável isolada em hook/lib.
- **Esforço:** G · **Impacto no custo:** 🔥 Alto

### T6 — Quebrar a UI dos god-components (frontend — coordenar)
- [ ] **Fazer:** dividir os mesmos 30 arquivos em subcomponentes. Meta: **ideal < 400 linhas,
  teto 600**. Começar pelos piores: `EquipeSprintDetalhes.tsx` (2.724), `EquipeProjetos.tsx`
  (2.296), `osg/GerarDocumento.tsx` (2.010).
- [ ] **Aceite:** nenhum arquivo de UI > 600 linhas; comportamento idêntico (validar com `/verify`).
- **Esforço:** G · **Impacto no custo:** 🔥 Alto · 👥 requer apoio do frontend

### T7 — Criar mapa de navegação módulo → pasta → página
- [ ] **Problema:** 1.333 arquivos em pastas fundas (média 4,3 níveis) → cada "acha onde está X"
  gasta vários `grep`/`glob`/`read`.
- [ ] **Fazer:** criar `docs/geral/mapa-navegacao.md` listando cada módulo (equipe, osg, mapa,
  fiscal, dev, gestao) → pasta → páginas/rotas principais e hooks correspondentes.
- [ ] **Aceite:** dá pra localizar a página de um módulo pelo mapa, sem busca.
- **Esforço:** M · **Impacto no custo:** 🟨 Médio

---

## Apêndice A — Arquivos de código > 800 linhas (alvos de T5/T6)

`types.ts` (8.932) é autogerado — **não entra** (tratado em T1/T3). Os 30 alvos:

| Linhas | Arquivo |
|---|---|
| 2.724 | src/pages/equipe/EquipeSprintDetalhes.tsx |
| 2.296 | src/pages/equipe/EquipeProjetos.tsx |
| 2.010 | src/pages/equipe/osg/GerarDocumento.tsx |
| 1.609 | src/pages/equipe/mapa/DashboardRoiPage.tsx |
| 1.586 | src/pages/equipe/EquipeProcessos.tsx |
| 1.575 | src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx |
| 1.483 | src/pages/equipe/dev/ApuracaoPisCofins.tsx |
| 1.297 | src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx |
| 1.285 | src/pages/equipe/dev/ConsultaXMLs.tsx |
| 1.263 | src/pages/equipe/dev/ProcessoDifal.tsx |
| 1.259 | src/pages/equipe/EquipeKanban.tsx |
| 1.241 | src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx |
| 1.172 | src/pages/equipe/dev/ControlePerdcomp.tsx |
| 1.154 | src/components/equipe/dev/perdcomp/PerDetailModal.tsx |
| 1.153 | src/pages/equipe/mapa/MapearProcessoPage.tsx |
| 1.064 | src/components/equipe/mapa/WizardRoi.tsx |
| 1.017 | src/pages/equipe/dev/ConsultaEFDICMS.tsx |
| 999 | src/components/equipe/dev/calculadora-ibs-cbs/AbaPorEstado.tsx |
| 992 | src/pages/equipe/EquipeDaily.tsx |
| 981 | src/components/equipe/dev/perdcomp/DcompFormModal.tsx |
| 951 | src/hooks/useDiagnosticoPatrimonial.ts |
| 948 | src/components/equipe/ProcessImprovementModal.tsx |
| 916 | src/pages/equipe/EquipeDemandas.tsx |
| 899 | src/components/equipe/dev/ExportDialog.tsx |
| 891 | src/components/equipe/dev/EFDExportDialog.tsx |
| 864 | src/pages/gestao/GestaoChamadosDashboard.tsx |
| 862 | src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx |
| 830 | src/pages/equipe/EquipeChamados.tsx |
| 812 | src/pages/equipe/dashboards/AnaliseInteligente.tsx |
| 811 | src/pages/equipe/fiscal/FiscalDashboard.tsx |

## Apêndice B — Hábitos de uso (sem código, ganho imediato)

- Apontar o arquivo/caminho ("edita `EquipeKanban.tsx`") em vez de "acha onde está X".
- `/clear` entre tarefas não relacionadas para não arrastar contexto antigo.
- Nunca pedir leitura do `types.ts` inteiro — usar o Mapa do Banco (T1).
