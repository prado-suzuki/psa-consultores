# Valor contábil por titular e integralização parcial de matrícula

Plano de handoff. Nasce da conversa de **14/09/2026** com a OSG, que levantou dois problemas
na integralização de matrículas. O estado do código abaixo foi medido na `develop` no mesmo dia.

---

## 0. Estado da execução (14/09/2026)

Executado na `develop`, em quatro commits, na ordem do §10. Suíte inteira verde (5.624 testes),
typecheck e build limpos.

| passo | estado | onde |
|---|---|---|
| 1. §4 com a OSG | **ABERTO** | ver abaixo |
| 2. Migration + backfill + delta do `types.ts` | ✅ | `20260914152326_titularidade_valor_contabil_e_a_integralizar.sql`, aplicada no sandbox |
| 3. Hooks, UI, função pura do aviso, testes | ✅ | `src/lib/osg/integralizacaoDaMatricula.ts` + `TitularidadesPanel`, `TitularidadeLinha`, `TitularesIniciaisSection`, `MatriculaDadosTab` |
| 4. Mapeador (os cinco pontos) | ✅ | `src/lib/templates/mapeadores.ts` |
| 5. Templates | **PARCIAL** | o vocabulário ganhou `valorDoImovel` e `valorIntegralizado`; os blocos da biblioteca não foram revisados, e é isso que depende do §4 |
| 6. Aposentar o flag `integralizador` | ✅ | `20260914155243_titularidade_aposenta_o_integralizador.sql` (índices); a coluna cai num ciclo depois |

**Uma decisão de desenho divergiu do plano, e ela é a mais importante de saber:**
a leitura por valor é ligada **por matrícula**, não por titular. O plano dizia "titular sem valor
a integralizar não integraliza", ponto; ao pé da letra, uma matrícula cadastrada só com o valor no
modal (nenhum titular com valor) sairia com capital zero e ninguém receberia quota. Então: a
matrícula que tem **algum** valor por titular é lida pelos valores, e nela o vazio significa "não
integraliza"; a matrícula sem nenhum continua na conta antiga (fração × valor). O backfill cobriu
o acervo existente, mas não cobre matrícula criada depois dele.

**Duas decisões menores, pelo mesmo motivo (preservar o contrato gerado):**

- O backfill escreve na linha DE DIREITO da pessoa e, para quem só tem linha de fato, **na linha
  de fato**. Deixá-la vazia tiraria essa pessoa da integralização. A UI segue a mesma regra: os
  campos aparecem na linha de direito, e na de fato só de quem não tem linha de direito.
- `mapearMatricula` tem dois caminhos, e o da alínea tem precedência: dentro de
  `{{#integralizacoes}}` quem lidera é o sócio do parágrafo (como sempre foi, e é o que faz a
  matrícula dividida entre dois sócios sair certa); no imóvel avulso, proprietário são os que
  integralizam e remanescente os que não.

**O que ficou aberto**, e só o §4 é bloqueante para o resto:

1. O §4 (qual valor a cláusula imprime). O mapeador já publica os dois números em campos
   distintos, então a resposta da OSG vira revisão de texto dos blocos, não mais código.
2. A tela do aumento de capital ainda mostra `m.vlr_contabil` e precisa passar a mostrar o a
   integralizar (§8).
3. O radar de alterações contratuais vai enxergar os campos novos como mudança na primeira edição
   depois do backfill (§8, documentado e não tratado).
4. A RPC `criar_matricula_com_titular` continua ignorando os valores: o primeiro titular os recebe
   num `update` logo depois dela. Mudar a RPC é DDL, portanto passo humano em produção.
5. **Produção ainda não recebeu as duas colunas.** Elas precisam entrar pelo chat do Lovable
   antes de este código chegar na `main`.

---

## 1. O que a OSG relatou

1. **Integralização parcial.** Um sócio pode integralizar só a fração dele de uma matrícula
   (33%, por exemplo). Os outros 67% ficam de fora: ou pertencem a alguém que nem vai estar no
   quadro societário, ou pertencem a um sócio que prefere não integralizar aquela parte.
2. **Valor contábil não é rateado por igual.** O valor contábil da matrícula é a soma do que
   cada titular declarou na DIRPF. Titulares erram para mais ou para menos, e nesses casos o
   contador do cliente decide quanto cada um integraliza. Então precisa existir, **por titular**,
   um valor contábil e um valor a integralizar, e a matrícula precisa avisar quando os valores a
   integralizar não condizem com a distribuição de titularidade.

## 2. O que o código faz hoje

| mecanismo | onde | comportamento |
|---|---|---|
| Valor contábil | `matricula.vlr_contabil`, fallback `bem.vlr_contabil` | um valor só por matrícula, digitado em `MatriculaDadosTab.tsx` |
| Fração do titular | `titularidade.fracao` (0 < x ≤ 100, opcional) | painel de titulares soma e só avisa se passa de 100% |
| Flag `integralizador` | `titularidade.integralizador`, índice único parcial por matrícula e por bem | **um por imóvel**. Escolhe quem lidera a redação ("33% de propriedade de X, remanescente de Y"). Não decide quem integraliza |
| Quem integraliza | `mapearIntegralizacoes` (`src/lib/templates/mapeadores.ts`) | **todo sócio que é titular** integraliza a fração dele do valor único. O flag do banco é ignorado ali (cada sócio lidera a própria alínea) |
| Valor da alínea | idem | `vlr_contabil × fracao`; sem fração, divide por igual o que sobra; a última alínea da matrícula "fechada" absorve o resíduo |
| Capital da PR (sem quadro gravado) | `calcularCapitalSociedade` | soma o **valor inteiro** de cada matrícula que tenha valor e pelo menos um titular |
| Quotas por sócio na PR | `calcularParticipacoesPR` → `ratearMatriculaEntreTitulares` | rateia o valor inteiro entre **todos** os titulares, sócio ou não |
| Proposta de aporte inicial | `src/lib/osg/aporteInicial.ts` | grava em `movimentacao_quotas` exatamente o que o rateio acima calcula, um movimento por (sócio, bem) |
| Titular que não é sócio | `mapearMatricula` | aparece só no texto, como área remanescente, e só quando existe um integralizador marcado com fração |

Duas consequências disso, que são os defeitos de verdade:

- Na integralização parcial, o capital da PR e o rateio de quotas contam os 67% que ficaram de
  fora. Se o dono dos 67% está cadastrado como titular sem ser sócio, ele recebe quotas no quadro
  derivado e vira "titular legado" que trava a gravação do aporte inicial.
- Não existe lugar para o valor de cada titular. O rateio é sempre proporcional à fração, e não
  há como registrar "A declarou 60, B declarou 40, e o contador mandou integralizar 50 e 50".

A tabela antiga `capital_integralizacao`, que tinha `vlr_contabil` por (sócio, bem), foi renomeada
para `movimentacao_quotas` em 18/08/2026 e hoje é o livro de quotas. Ela registra o **resultado**
na formalização, não a entrada do contador. Não serve para este dado.

## 3. Decisões fechadas em 14/09/2026

Respostas do Bernardo, depois de conversa com a OSG:

1. **As quotas seguem o valor a integralizar decidido pelo contador**, não a fração. Na prática o
   contador ajusta os valores para condizer com a titularidade (60/40 declarado vira 50/50
   integralizado quando a titularidade é 50/50), mas o sistema grava o que ele decidiu.
2. **O valor a integralizar do titular não precisa bater com o contábil dele.** Pode ser maior ou
   menor.
3. **O aviso compara os valores a integralizar com a distribuição de titularidade** (as frações).
4. **Só matrícula.** Bem sem matrícula (veículo, quotas de outra empresa) fica como está.

Decisões de modelagem tomadas neste plano, para não travar quem executa (objeção é bem-vinda):

5. **A verdade mora na linha de titularidade de direito.** Valores entram na linha `DIREITO` ou
   `NUE_PROP`, nunca em `FATO` nem `USUFRUTO`: quem integraliza é quem tem a propriedade. A mesma
   pessoa pode ter linha de fato e de direito; o `dedupTitulares` já funde as duas por pessoa e
   basta que ele leve os valores junto.
6. **Titular com "a integralizar" vazio não integraliza.** É isso que expressa os 67% de fora,
   tanto para o não-sócio quanto para o sócio que segura a parte dele. Não entra em capital, não
   ganha quota, não trava o aporte inicial. Continua no texto como remanescente.
7. **O valor contábil da matrícula vira soma dos contábeis dos titulares.** A coluna
   `matricula.vlr_contabil` fica, como cache mantido pela aplicação (mesmo hook que salva o
   titular), porque relatório DP, calculadora ITCMD e o mapeador leem dela. Quando a matrícula
   tem ao menos um titular com valor, o campo no modal passa a leitura.
8. **O flag `integralizador` fica redundante e sai na mesma frente.** Quem lidera a alínea já é o
   sócio do parágrafo; o remanescente passa a ser "titulares sem valor a integralizar". Se a
   frente apertar, aposentar o flag pode ficar para depois, mas ele não pode continuar decidindo
   texto que o valor contradiz.

## 4. Primeiro passo: a decisão que ainda não foi tomada

Antes de codar, confirmar com a OSG **qual valor a cláusula imprime como valor do imóvel**
("...imóvel matrícula nº N, avaliado em R$ X"). Hoje X é o valor inteiro da matrícula em todas as
alíneas. Com integralização parcial e valores ajustados, três candidatos divergem:

| candidato | o que é | consequência |
|---|---|---|
| soma dos contábeis dos titulares | o valor do imóvel inteiro, como a DIRPF conta | mantém o texto de hoje; a alínea precisa dizer também quanto o sócio integraliza, senão o leitor soma errado |
| soma dos valores a integralizar | o que entra na sociedade daquela matrícula | casa com o capital, mas "avaliado em" deixa de ser o valor do imóvel quando alguém ficou de fora |
| só a parte do sócio da alínea | o que ESTE sócio integraliza | cada alínea fecha sozinha e a soma das alíneas é o capital; a matrícula compartilhada aparece com valores diferentes em parágrafos diferentes |

O mapeador já tem os dois campos (`imovel.valor` e o valor da alínea sobrescrito em
`mapearIntegralizacoes`), então provavelmente a resposta é "os dois, em lugares diferentes do
bloco". Trazer um contrato real da OSG com integralização parcial resolve isso em dez minutos.
Enquanto não resolver, o resto do plano pode andar: modelo, UI e aviso não dependem disso.

## 5. Modelo de dados

**⚠️ MIGRAÇÃO**, aditiva, idempotente, em `supabase/migrations/`:

```sql
alter table public.titularidade
  add column if not exists vlr_contabil     numeric(15,2),
  add column if not exists vlr_integralizar numeric(15,2);
```

- Sem `NOT NULL`, sem default. Vazio em `vlr_integralizar` é o estado "não integraliza" da
  decisão 6. Vazio em `vlr_contabil` é "não informado".
- Check de não-negativo nas duas, pelo par `drop constraint if exists` + `add constraint`.
- **Backfill** que preserva o contrato gerado: para cada matrícula com `vlr_contabil` e titulares,
  atribuir a cada titular de direito o que `ratearMatriculaEntreTitulares` calcula hoje (fração ×
  valor; sem fração, divisão igual; último absorve o resíduo), nas **duas** colunas. Antes e depois
  da migração, o mesmo cadastro gera o mesmo contrato. A divergência só nasce quando alguém editar.
  O backfill é `update ... where vlr_integralizar is null`, para rodar duas vezes sem estragar.
- Depois da fatia que aposenta o flag: `drop index if exists idx_titularidade_integralizador_*` e
  a coluna sai numa migration posterior, só depois do corte validado em uso real (mesmo
  padrão da `quadro_societario`).
- `types.ts`: **só o delta** (duas colunas em `titularidade`). O sandbox está com drift e o
  arquivo inteiro não pode ser regenerado (ver `AGENTS.md` §"O sandbox é compartilhado").

Produção recebe as colunas **antes** do código chegar na `main` (passo humano no chat do Lovable).
Coluna aditiva parada lá é inofensiva.

## 6. O aviso

Entre os titulares que integralizam (valor a integralizar preenchido), o esperado de cada um é:

```
esperado_i = Σ vlr_integralizar × (fracao_i / Σ fracao dos que integralizam)
```

A linha acende quando `|vlr_integralizar_i − esperado_i|` passa de um centavo. Titular sem fração
não entra na conta e o aviso não acende para a matrícula (sem fração não há distribuição a
comparar). É **aviso, não trava**: a decisão do contador prevalece, e o dado salva do mesmo jeito.
A conta é função pura em `src/lib/osg/` com teste, e a UI só a exibe.

No exemplo da OSG: titularidade 50/50, integralizar 60/40 acende; contador ajusta para 50/50,
apaga. Integralização parcial (A 33% integraliza, B 67% não): só A integraliza, Σ fração = 33,
esperado de A é o próprio total, nada acende.

## 7. Mudanças no código

**Hooks** (`src/hooks/useDiagnosticoPatrimonial.ts`)

- `TitularidadeRow` ganha os dois campos; `TITULARIDADE_DIFF_FIELDS` também, para o `useAuditLog`
  registrar o diff (e `auditFieldFormatter.ts` ganha os rótulos).
- `useUpsertTitularidade` e `useDeleteTitularidade` recalculam `matricula.vlr_contabil` como soma
  dos contábeis dos titulares da matrícula, quando a âncora é matrícula e há ao menos um valor.
- `useGeracaoDocumento` passa `vlrContabil` e `vlrIntegralizar` em `titulares` (linhas ~293 e
  ~371) e no `TitularParaMapear`.
- `useSetIntegralizador` sai na fatia do flag.

**UI** (`TitularidadesPanel.tsx`, `TitularesIniciaisSection.tsx`, `MatriculaDadosTab.tsx`),
com liberdade de desenho. O que precisa acontecer:

- Cada titular de direito de matrícula mostra e edita contábil e a integralizar. Linha de fato,
  usufruto e âncora de bem não mostram os campos (decisões 4 e 5).
- A matrícula mostra a soma dos contábeis e a soma dos a integralizar, e o campo "Vlr. contábil"
  do modal vira leitura quando há titular com valor.
- A linha fora do esperado (§6) fica marcada e diz o valor esperado.
- O painel hoje avisa só "excede 100%"; passa a avisar também "soma das frações abaixo de 100%"
  como informação, porque com integralização parcial isso é normal e não pode parecer erro.
- Onde a liberdade acaba: não mexer no fluxo de FATO → copiar para DIREITO, nem no layout do
  modal fora da aba de titulares. Isso é outra tarefa.

**Mapeador** (`src/lib/templates/mapeadores.ts`), os cinco pontos que hoje fazem valor × fração:

| função | hoje | passa a |
|---|---|---|
| `valorParaCapital` | valor inteiro da matrícula | Σ `vlrIntegralizar` dos titulares |
| `ratearMatriculaEntreTitulares` | fração × valor, sem fração divide igual | `vlrIntegralizar` de cada titular; titular sem valor recebe zero e sai do rateio |
| `calcularParticipacoesPR` | herda o rateio | idem; não-sócio sem valor não vira "titular legado" |
| `mapearIntegralizacoes` | fração × valor por alínea, fechamento por matrícula "fechada" | `vlrIntegralizar` do sócio; fechamento deixa de ser preciso porque os centavos vêm do cadastro |
| `mapearMatricula` | fracionado = flag + fração + outros | fracionado = há titular sem valor; `proprietario` = quem integraliza, `remanescente` = quem não |

A identidade "Σ quotas dos sócios === totalQuotas" continua sendo a invariante, e o teste que a
cobre em `mapeadores.test.ts` é a rede. `aporteInicial.ts` não muda de código: ele reusa as duas
funções acima.

**Templates.** Depende do §4. Se a resposta for "os dois valores", o vocabulário de `imovel`
ganha um campo (algo como `valorIntegralizado`) e os blocos de integralização da biblioteca
são revisados. Blocos já validados em documentos gerados ficam congelados no snapshot, como hoje.

**Testes.** Função pura do aviso; `ratear`/`participacoes`/`mapearIntegralizacoes` com o caso
60/40 sobre 50/50 e o caso 33% parcial com não-sócio; teste de wiring do hook que recalcula a
soma (padrão dos `useDomain*`); e2e de geração com matrícula parcial, se o harness do Playwright
estiver de pé.

## 8. Fora de escopo

- Titularidade de **bem** sem matrícula (decisão 4).
- `vlr_contabil_ajustado`, `vlr_mercado`, `vlr_benfeitorias`: seguem por matrícula.
- Calculadora ITCMD e relatório DP: continuam lendo `matricula.vlr_contabil`, que agora é soma.
  Não mudam.
- Empresa com quadro **gravado**: o capital vem do livro de quotas, não da derivação. Esta frente
  muda a derivação (constituição e proposta de aporte inicial). Aumento de capital com imóvel novo
  já entra pelo livro e não é tocado aqui, mas a tela dele mostra `m.vlr_contabil` e precisa
  passar a mostrar o a integralizar.
- Radar de alterações contratuais: o diff do snapshot registrado contra o cadastro vivo vai
  enxergar os campos novos como mudança na primeira edição depois do backfill. Documentar, não
  tratar aqui.

## 9. Armadilhas para quem executa

- **Dedup FATO + DIREITO.** `dedupTitulares` funde por pessoa e pega "a primeira fração não
  nula". Os valores têm de vir da linha de direito; se a de fato vier primeiro na ordem, o merge
  precisa preferir a linha que tem valor, não a primeira.
- **Usufruto e nua-propriedade** (`USUFRUTO`, `NUE_PROP`, criados pela frente de doação de
  quotas): o nu-proprietário é quem tem valor. O usufrutuário não integraliza.
- **Matrícula sem bem** (`bem_id` nulo) entra no rateio hoje e continua entrando.
- **Índice único do integralizador** ainda existe enquanto a fatia do flag não roda. Não escrever
  `integralizador = true` em mais de uma linha antes de derrubá-lo.
- **`db:sync`, não `db push`**, e `types.ts` só com o delta.

## 10. Ordem de entrega

1. Confirmar o §4 com a OSG (pode andar em paralelo com 2 e 3).
2. Migration + backfill + delta do `types.ts`, commit sozinho. Sandbox via `bun run db:sync --apply`.
3. Hooks e UI (§7), com a função pura do aviso e testes. Neste ponto o contrato gerado ainda sai
   igual, porque o backfill reproduz o rateio.
4. Mapeador (§7), trocando fração por valor nos cinco pontos, com os testes novos. Aqui o contrato
   passa a refletir o cadastro.
5. Templates conforme o §4.
6. Aposentar o flag `integralizador` (UI, hook, índice), migration de drop da coluna num ciclo
   depois.
