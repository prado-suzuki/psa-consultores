# Avisos de prazo de tarefa — textos do sino

Os avisos internos que a equipe recebe no sino sobre o prazo das suas tarefas (GES-01A). O
irmão interno do [`avisos-cliente.md`](avisos-cliente.md), que guarda os textos que o cliente
recebe.

> **Redação fechada pela Patrícia em 02/09/2026.** O texto anterior era de trabalho, escrito
> junto com a varredura em 31/08 e 01/09.
>
> **Escrito, não aplicado.** A migração
> `supabase/migrations/20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql` está no repo e
> ainda não rodou em banco nenhum — ver "Estado", no fim.

## A regra, enxuta

| | |
|---|---|
| **Título** | marco + tarefa |
| **Corpo** | contexto + prazo |
| **Prazo à frente** | `Prazo em {data}.` |
| **Prazo vencido** | `O prazo era {data}.` |
| **Revisor** | `Aguardando sua revisão.` |
| **Tarefa com o cliente** | `Aguardando o cliente.` |
| **Gestor** | entra quando houver atraso, e o corpo dele abre com `Responsável: {nome}.` |

São **3 marcos com variação de contexto**, não uma dúzia de avisos diferentes. Nada de
"Atrasada aguardando cliente" ou "Revisão atrasada": isso multiplicaria variação sem
necessidade. **"Tarefa atrasada" descreve o estado do prazo, não acusa o responsável** — quem
diz onde a tarefa está é o contexto, no corpo.

## Em uma tabela: o que é

| | |
|---|---|
| **O que é** | aviso de prazo de tarefa, só no sino (`notificacao_canal = 'sino'`). Não vai e-mail nem WhatsApp |
| **Quantos avisos** | até 3 por tarefa: 3 dias antes, no dia, e um dia depois. Passado isso, não cobra mais |
| **Quando sai** | cron diário `alertar-tarefas-prazo-diario`, 7h em Cuiabá — antes de o dia de trabalho começar |
| **Quem recebe** | quem está com a tarefa (ou o revisor, enquanto está em revisão) nos três marcos; o gestor da equipe **só no atraso** |
| **Quem não entra** | tarefa concluída, tarefa em backlog, tarefa sem prazo |
| **Onde aparece** | sino do cabeçalho; o clique abre a tarefa |
| **Quem escreve o texto** | `alertar_tarefas_por_prazo()`, no banco |

## O que passa a sair

Cenário: tarefa **"Apuração ICMS — Frigobom"**, prazo **05/09/2026**, responsável **Layara
Souza**, revisora **Patrícia Melo**, gestor **Felipe Prado**.

| # | Quando | Quem recebe | Título | Corpo |
|---|---|---|---|---|
| 1 | 3 dias antes | responsável | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` |
| 2 | 3 dias antes, em revisão | revisor | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando sua revisão. Prazo em 05/09/2026.` |
| 3 | 3 dias antes, com o cliente | responsável ou revisor | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` |
| 4 | vence hoje | responsável | `Vence hoje: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` |
| 5 | vence hoje, em revisão | revisor | `Vence hoje: Apuração ICMS — Frigobom` | `Aguardando sua revisão. Prazo em 05/09/2026.` |
| 6 | vence hoje, com o cliente | responsável ou revisor | `Vence hoje: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` |
| 7 | venceu ontem | responsável | `Tarefa atrasada: Apuração ICMS — Frigobom` | `O prazo era 05/09/2026.` |
| 8 | venceu ontem, em revisão | revisor | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando sua revisão. O prazo era 05/09/2026.` |
| 9 | venceu ontem, com o cliente | responsável ou revisor | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando o cliente. O prazo era 05/09/2026.` |
| 10 | venceu ontem | **gestor** | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Responsável: Layara Souza. O prazo era 05/09/2026.` |
| 11 | venceu ontem, com o cliente | **gestor** | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Responsável: Layara Souza. Aguardando o cliente. O prazo era 05/09/2026.` |

A linha 11 é a única que não estava na redação fechada: ela cai da regra, porque o prefixo do
gestor e o contexto são partes independentes do corpo. Se o gestor não deve receber o contexto,
o corpo dele volta a ser só `Responsável: … O prazo era …` — é uma linha na migração.

### O que mudou

| Antes | Depois | Por quê |
|---|---|---|
| `Responsavel:` · `Aguardando sua revisao.` | `Responsável:` · `Aguardando sua revisão.` | acento, que os títulos já tinham |
| `Tarefa atrasada: …` + `Aguardando sua revisao. Prazo em 05/09/2026.` | `Tarefa atrasada: …` + `Aguardando sua revisão. O prazo era 05/09/2026.` | título e corpo se contradiziam: o corpo falava no futuro de um prazo vencido |
| gestor recebia os três marcos | gestor recebe só o atraso | o sino do gestor virava painel operacional paralelo, e o aviso de atraso perdia força no volume. Quem executa precisa de antecipação; quem gerencia precisa da exceção |
| corpo escolhido pela primeira condição que casava, com o marco em último | **marco decidido antes do contexto**, e o corpo montado em duas partes | é o que elimina a contradição sem criar mensagem nova |

## Os campos que entram no texto

| Campo | Conteúdo | Vem de |
|---|---|---|
| título da tarefa | como está cadastrado, sem alteração | `org_tasks.title` |
| data | prazo da tarefa, `dd/mm/aaaa` | `org_tasks.due_date` |
| nome | quem está com a tarefa, só no aviso do gestor | `profiles` (e-mail como reserva) |

## Decisões

| Ponto | Decisão (02/09/2026) |
|---|---|
| **Títulos** | não mudam. Curtos, claros e escaneáveis |
| **Acentos** | corrigidos no corpo |
| **Atrasada com corpo no futuro** | resolvido pela ordem: **primeiro o marco, depois o contexto** |
| **Prefixo do gestor** | fica `Responsável: {nome}.` — no sino é mais rápido de escanear e mantém a informação em blocos previsíveis. Não vira "Tarefa de {nome}…" |
| **Gestor recebe quais marcos** | **somente tarefa atrasada** |
| **Título nomeia o cliente** | **não.** Mantém o título como cadastrado — hoje o texto só dispõe de título, data e nome, e ampliar o escopo técnico agora não se justifica. Se na prática os títulos não trazem o cliente, o problema é o padrão de nomenclatura das tarefas, não a notificação |

## Rótulo na linha do sino

| Tipo no banco | Rótulo |
|---|---|
| `tarefa_prazo_proximo` | **Prazo de tarefa** — e não "Prazo próximo": o mesmo tipo cobre "3 dias antes" e "vence hoje" |
| `tarefa_atrasada` | **Tarefa atrasada** |

Isso é front (`src/lib/notificacoesInternas.ts`) e **não entra agora**: a tabela de rótulos é
exaustiva sobre o enum lido de `types.ts`, que na `main` é o de produção, e produção ainda não
tem os dois valores. Escrever a entrada hoje não compila.

Não há risco de esquecer: no dia em que o enum chegar a produção e o `types.ts` for
regenerado, **a compilação quebra** até alguém escrever os dois rótulos — é para isso que
aquele `Record` é exaustivo. Os textos acima são o que deve ser escrito lá.

## Estado

| | |
|---|---|
| **Migração** | `20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql` — escrita, **não aplicada em banco nenhum** |
| **Por que não aplicada** | o sandbox tem dezenas de migrações locais pendentes de outras frentes, e `supabase db push` aplicaria todas de uma vez. Aplicar só esta é decisão da Patrícia |
| **Produção** | não tem nem os dois tipos do enum. Nada deste aviso chegou a ninguém ainda |
| **Front** | o rótulo dos dois tipos novos entra quando o enum chegar a produção (acima) |

## Referências

| Arquivo | O que tem |
|---|---|
| `supabase/migrations/20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql` | a redação fechada: as duas funções reemitidas |
| `supabase/migrations/20260901135620_ges01a_varredura_respeita_ambiente.sql` | a versão anterior, com o texto de trabalho |
| `supabase/migrations/20260831202229_ges01a_tipos_de_aviso_de_prazo.sql` | os dois tipos novos do enum |
| `supabase/migrations/20260901144842_ges01a_ativar_cron_por_banco.sql` | o cron e o ambiente por banco |
| `src/lib/notificacoesInternas.ts` | rótulo e tom por tipo, e o destino do clique |
| [`avisos-cliente.md`](avisos-cliente.md) | os textos do cliente, e as regras de escrita da §"Como estes textos são escritos" |
