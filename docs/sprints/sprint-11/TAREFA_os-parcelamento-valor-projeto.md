# TAREFA — Parcelamento da OS: nº de parcelas, entrada e valor da parcela

> **Origem:** conferência da planilha do financeiro (`CONTAS A RECEBER - CONTRATOS A FATURAR`) com a Patrícia em 2026-08-13.
> **Base de dados já consolidada:** `OS - VALORES E PARCELAS (base para cadastro).xlsx` — 75 contratos, 70 clientes.
> Isto é o **o quê**. O como (migração, decomposição, onde mora o cálculo) é do tech lead.

## O problema

Hoje a OS só tem **Valor do Projeto (R$)** (seção `04 VALORES`). O contrato com o cliente é
parcelado: a planilha do financeiro guarda o parcelamento na coluna `Parcela` (`08/12` = oitava
de doze) e o valor de **cada parcela** na coluna `Valor A Faturar`. O sistema não tem onde
registrar quantas parcelas o contrato tem, então:

- não é possível saber, pela OS, quanto o cliente paga por mês;
- o campo Valor do Projeto está zerado na maioria das OS, porque quem cadastra não sabe se
  deve pôr o valor da parcela ou o total do contrato;
- o financeiro continua controlando parcelamento fora do sistema, em planilha.

**Exemplo real** — ALESSIO SANSAO, OS 058/2026: planilha mostra `08/12 … 12/12`, R$ 3.000,00 por
parcela. O contrato é de 12 × 3.000 = **R$ 36.000,00**. Hoje a OS mostra R$ 0,00.

## O que deve passar a existir

Na OS, seção `04 VALORES`:

| # | Campo | Tipo | Regra |
|---|---|---|---|
| 1 | **Valor do Projeto (R$)** | já existe | passa a significar sempre o **total do contrato**, não a parcela |
| 2 | **Nº de parcelas** | inteiro, novo | mínimo 1; 1 = pagamento único. Sem parcelamento definido, 1 |
| 3 | **Entrada (R$)** | valor, novo | opcional, 0 quando não houver |
| 4 | **Valor da parcela** | calculado, só leitura | `(Valor do Projeto − Entrada) ÷ Nº de parcelas` |

O campo 4 **não é digitado e não é gravado**: é derivado na tela, ao lado dos outros três, para
quem cadastra conferir na hora contra a planilha do financeiro. Se o resultado tiver dízima
(ex.: 7.083,33), exibir arredondado em 2 casas — a diferença de centavos da última parcela é
tratada no faturamento, não aqui.

Os três campos aparecem também no **modo de leitura** da OS (hoje mostra apenas "Valor do
Projeto"), e o valor da parcela entra no diff de auditoria só se os campos gravados mudarem —
o derivado não vira linha de log.

## Decisões minhas, já tomadas

- **Nº de parcelas é do contrato, não do exercício.** Um contrato de 24 parcelas que atravessa
  2026 e 2027 é uma OS com `24`, não duas OS de 12. Na planilha do financeiro isso aparece como
  o mesmo cliente repetido em dois exercícios (ex.: ALTAIR NODARI, parcelas 16-20 em 2026 e
  21-24 em 2027) — é **uma** OS.
- **A entrada sai do contrato, não da planilha.** A planilha do financeiro lista só o que ainda
  falta faturar; uma entrada já paga não está lá. Por isso o campo é de digitação manual e o
  "valor do projeto" calculado a partir da planilha pode estar incompleto onde houve entrada.
- **Periodicidade é mensal.** Todo o parcelamento de hoje é mensal; não criar campo de
  periodicidade agora.

## Decisão pendente (minha) — fica para depois desta tarefa

- **Dia de vencimento** da parcela. A planilha tem (Alessio vence dia 28; há contratos em 5, 9,
  15, 20, 25). Com `data de início + dia de vencimento + nº de parcelas` o sistema consegue
  projetar o calendário de faturamento inteiro — mas isso é o próximo passo, não este.
  Não incluir nesta entrega.

## ⚠️ MIGRAÇÃO — esta parte é do Eduardo

A tela (campos, cálculo, leitura, auditoria) sai comigo. Do Eduardo é só o banco:

- **`ordem_servico.numero_parcelas`** — inteiro, aceita nulo, default `1`, com validação de
  faixa (1 a 360). 1 = pagamento único.
- **`ordem_servico.valor_entrada`** — `numeric`, aceita nulo, default `0` — mesmo padrão de
  `valor_projeto`, `valor_reembolso_km` e `valor_reembolso_refeicao`.

Sem backfill e sem tocar em `valor_projeto`: o preenchimento é manual, pela planilha
consolidada. O valor da parcela **não** é coluna — é derivado na tela.

Nada a fazer em `centros_custo`: os nomes antigos da planilha do financeiro já correspondem a
códigos existentes (ver Achados).

Depois da migração: regenerar os tipos do Supabase e atualizar
[`docs/rls/mapa-do-banco.md`](../../rls/mapa-do-banco.md) (verbete `ordem_servico`).

## Andamento

**Tela — ✅ CONCLUÍDO (2026-08-13).** Os três campos existem na OS, com o valor da parcela
derivado ao lado deles, em edição e em leitura; nº de parcelas e entrada entram no diff de
auditoria com rótulo em português ("Nº de Parcelas", "Entrada") e o derivado não vira linha
de log. Onde ficou:

- `src/lib/osParcelamento.ts` (+ teste) — `calcularValorParcela`, `parseNumeroParcelas`,
  `entradaExcedeProjeto`. O cálculo é puro e testado contra os cinco casos do Aceite.
- `src/components/equipe/client-form/OsValoresEdicao.tsx` e `OsValoresLeitura.tsx` — a seção
  `04 VALORES` saiu do `ContratosTab.tsx`, que estava a 14 linhas do teto de 600 do
  `AGENTS.md` (hoje 545). A leitura passou a mostrar os seis valores juntos, na mesma ordem
  da edição, em vez de Valor do Projeto solto e os reembolsos em outro ponto da grade.
- Rascunho, carga e gravação: `src/types/clientForm.ts`, `client-form/constants.ts`,
  `useClientEditData.ts`, `useSaveClientTransaction.ts` (payload + lista `osFields`),
  `audit/auditFieldFormatter.ts`.

Decisões da tela, para conferência:

- **`numero_parcelas` vazio é `null`, não 1.** OS antiga abre em "—" e continua assim até
  alguém preencher; só OS criada de agora em diante nasce com 1. Preencher 1 automaticamente
  inventaria um pagamento único que ninguém combinou, e sujaria o log de auditoria de toda OS
  antiga que fosse aberta e salva.
- **Entrada maior que o valor do projeto não barra o salvamento** — acende um aviso no campo
  e a parcela aparece negativa, para o erro ser visto na hora.
- O nº de parcelas trava em 360 na digitação, a mesma faixa da validação da coluna.

**Migração — escrita, aguardando aplicação pelo Lovable.**
`supabase/migrations/20260814170000_os_numero_parcelas_e_valor_entrada.sql` cria as duas
colunas com a faixa 1..360, os comentários das colunas (inclusive o de `valor_projeto`, que
passa a dizer "total do contrato") e nenhum backfill. É idempotente: reaplicar não dá erro, e
aplicar depois de o DDL ter sido rodado à mão no SQL Editor também não.

O `default 1` de `numero_parcelas` vem num segundo passo, **depois** de a coluna ser criada.
Junto do `add column` ele preencheria as 67 OS existentes com "1 parcela" — backfill acidental
que ninguém informou e que apagaria a diferença entre pagamento único e campo em branco.

**⚠️ Bloqueio para subir:** a tela grava `numero_parcelas` e `valor_entrada` no payload da OS.
Enquanto a migração não for aplicada, **qualquer salvamento de cliente falha** com erro de
coluna inexistente. A migração e a tela precisam ir juntas.

Depois de aplicada: regenerar os tipos do Supabase (`src/integrations/supabase/types.ts` é
autogerado — não editar à mão) e tirar o "aguardando aplicação" do verbete `ordem_servico` em
[`docs/rls/mapa-do-banco.md`](../../rls/mapa-do-banco.md), já atualizado com as duas colunas.

**B1 — ✅ CONCLUÍDO (2026-08-13).** A linha de Separação de Ambientes do `AGENTS.md` listava
`ordem_servico` entre as tabelas com coluna `ambiente`; ela não existe (conferido em
`src/integrations/supabase/types.ts`). Corrigida, e o verbete do mapa do banco passou a
registrar que o recorte dev/prod da OS vem do cliente.

## Onde isso encosta no código hoje

Levantamento para poupar busca — não é receita de implementação:

- `src/components/equipe/client-form/ContratosTab.tsx` — seção `04 VALORES` (edição) e o bloco
  de leitura logo acima. **Atenção:** o arquivo tem 586 linhas, quase no teto de 600 do
  `AGENTS.md`; provavelmente a seção de valores precisa sair para um subcomponente.
- `src/types/clientForm.ts` — `valor_projeto` no draft da OS
- `src/components/equipe/client-form/constants.ts` — `createDefaultDraftContract`
- `src/hooks/useClientEditData.ts` — leitura da OS para o formulário
- `src/hooks/useSaveClientTransaction.ts` — payload da OS e a lista `osFields` usada no diff
- `src/components/equipe/audit/auditFieldFormatter.ts` — rótulo dos campos no log
- `src/lib/clientFormValidation.ts` (+ teste) — se nº de parcelas entrar como obrigatório

## Aceite

1. Cadastro da OS 058/2026 (ALESSIO SANSAO) com Valor do Projeto 36.000,00, 12 parcelas e sem
   entrada mostra **3.000,00** como valor da parcela — igual à planilha do financeiro.
2. Com entrada de 6.000,00 nos mesmos 36.000,00 em 12 parcelas, a parcela vira **2.500,00**.
3. Nº de parcelas = 1 não quebra a tela nem divide por zero; campo vazio também não.
4. OS antigas, sem nº de parcelas, continuam abrindo e salvando sem erro.
5. Alterar nº de parcelas ou entrada aparece no histórico da OS com rótulo em português.

## Fora de escopo

- Gerar as parcelas como registros (contas a receber) — o sistema continua com **um** valor por
  OS; o cronograma de cobrança não é criado aqui.
- Substituir a planilha do financeiro.
- Dia de vencimento e calendário de faturamento (ver decisão pendente).

## Achados do cruzamento planilha × banco (prod, 2026-08-13)

O cruzamento da planilha do financeiro com o cadastro mostra o tamanho do problema e três
coisas que precisam de decisão antes ou junto com esta tarefa.

**Números:** 169 clientes ativos em prod, **67 OS** ativas. Dessas 67, **61 estão com Valor do
Projeto zerado**. Das 6 preenchidas, ao menos duas guardam o valor de **uma parcela**, não o
total do contrato — Agro Amazônia (035/2026) tem 10.000,00 e o contrato é 12 × 10.000,00;
Paiol (018/2026) tem 8.000,00 e o contrato é 12 × 8.000,00. É exatamente a ambiguidade que
esta tarefa resolve, e ela já produziu dado errado no banco.

**Outros campos faltando nas 67 OS:** empresa/faturamento em 12, rateio em 2, área do negócio
em 2, produtos contratados em 1.

**Nada a criar no catálogo de centros de custo.** A planilha do financeiro usa nomes antigos e
apelidos; todos caem em códigos que já existem. `PROTENUN` **mudou de nome e hoje é
PSA CONSULTORIA EMPRESARIAL (CC-0006)** — são ~40 linhas da planilha, 4 contratos, inclusive
rateios 70/30 e 50/50 contra PSA CONSULTORES. A planilha consolidada já traduz.

Demais apelidos traduzidos: `FAMILY` → PRADOSUZUKI EMPRESAS FAMILIARES (CC-0004),
`PSA CINSULTORES` → PSA CONSULTORES (CC-0007), `PSA CONULTORIA EMPRESARIAL` / `PSA CONSULTORIA`
→ PSA CONSULTORIA EMPRESARIAL (CC-0006), `TRIBUTÁRIO` → PRADO ADV TRIBUTARIO (CC-0003).

**B1 — `AGENTS.md` diz que `ordem_servico` tem coluna `ambiente`; ela não existe.** A separação
dev/prod da OS vem do cliente. Corrigir a linha em `AGENTS.md` (Separação de Ambientes) para
não induzir a queries com filtro inexistente.

## O que eu faço em paralelo (Patrícia)

Preenchimento manual a partir de `OS - VALORES E PARCELAS (base para cadastro).xlsx`, que
consolida a planilha do financeiro em **75 contratos** (70 nomes de cliente), já com nº de
parcelas, valor da parcela, total calculado, rateio traduzido para código de centro de custo e
o cruzamento com o cadastro. A coluna **AÇÃO** divide o trabalho:

| AÇÃO | Contratos | O que fazer |
|---|---|---|
| CRIAR OS | 41 | cliente cadastrado, nenhuma OS — abrir a OS |
| PREENCHER VALOR | 21 | OS existe com valor zerado |
| ESCOLHER A OS (várias) | 6 | cliente tem 2 a 4 OS; decidir a qual o contrato pertence |
| CLIENTE NÃO CADASTRADO | 4 | JAQUELINE CAVAGNOLLO SANSÃO & CIA, NAVA & SIMON, SILVIO CESAR SCHANTZ, VENTURAS PARTICIPAÇÕES E NEGÓCIOS |
| VALOR = 1 PARCELA | 2 | corrigir para o total (Agro Amazônia e Paiol) |
| OK | 1 | — |

Enquanto os campos novos não existirem, adianto Valor do Projeto e rateio; nº de parcelas e
entrada ficam esperando a migração. **7 contratos** estão marcados para conferência por terem
nº de parcelas ou valor de parcela divergentes na mesma planilha (provável segundo contrato ou
renegociação): COPRODIA, DIMAS POLTRONIERI, EDUARDO PICCINI, FRIBON TRANSPORTES, MARCIA MARIA
NUNES NERY, GRACIANE DA CRUZ e GREICI MARA DA CRUZ — nas duas últimas o rateio diz
`30% / 70%` mas só um centro de custo está nomeado.

O nome do cliente na planilha do financeiro raramente é igual ao do cadastro
(`RENE JUNQUEIRA BARBOUR E OUTROS` × `Rene Barbour`, `COAZUL` × `Cooazul - Cooperativa
Agroindustrial Vale Do Azul`). A planilha consolidada sugere o cliente por semelhança de nome,
com grau e alternativas, e marca **"conferir nome"** quando o casamento não é seguro — 28 dos
75 caem nesse caso, mais os 4 sem nenhum candidato, e eu confiro um por um.
