# Avisos de prazo de tarefa — textos do sino

Os avisos internos que a equipe recebe no sino sobre o prazo das suas tarefas (GES-01A). Este
arquivo é o **retrato do que o banco escreve hoje**, montado em 02/09/2026 para a revisão de
redação — o irmão interno do [`avisos-cliente.md`](avisos-cliente.md), que guarda os textos que
o cliente recebe.

> **A redação abaixo NUNCA passou por revisão.** Foi escrita junto com a varredura, em 31/08 e
> 01/09, como texto de trabalho. A migração que criou os tipos já registrava isso: *"os nomes
> descrevem o MARCO e não o texto da tela: o texto muda com a revisão da Patricia, o marco
> não."*
>
> **Está só no sandbox.** Produção tem os 13 valores antigos de `notificacao_tipo` — conferido
> em 02/09/2026 —, sem `tarefa_prazo_proximo` nem `tarefa_atrasada`. Ninguém viu esse texto
> ainda.

## Em uma tabela: o que existe

| | |
|---|---|
| **O que é** | aviso de prazo de tarefa, só no sino (`notificacao_canal = 'sino'`). Não vai e-mail nem WhatsApp |
| **Quantos avisos** | 3 por tarefa, no máximo: 3 dias antes, no dia, e um dia depois. Passado isso, não cobra mais |
| **Quando sai** | cron diário `alertar-tarefas-prazo-diario`, 7h em Cuiabá — antes de o dia de trabalho começar |
| **Quem recebe** | duas pessoas por tarefa: quem está com ela (ou o revisor, enquanto está em revisão) e o gestor da equipe do projeto |
| **Quem não entra** | tarefa concluída, tarefa em backlog, tarefa sem prazo |
| **Onde aparece** | sino do cabeçalho; o clique abre a tarefa |
| **Quem escreve o texto** | `alertar_tarefas_por_prazo()`, no banco |

## As 12 variantes que a pessoa pode ver

Cenário para ler a tabela: tarefa **"Apuração ICMS — Frigobom"**, prazo **05/09/2026**,
responsável **Layara Souza**, revisora **Patrícia Melo**, gestor **Felipe Prado**.

| # | Quando | Quem recebe | Título de hoje | Corpo de hoje | |
|---|---|---|---|---|---|
| 1 | 3 dias antes | responsável | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` | |
| 2 | 3 dias antes | gestor | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. Prazo em 05/09/2026.` | ✏️ |
| 3 | 3 dias antes, tarefa em revisão | revisor | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` | ✏️ |
| 4 | 3 dias antes, tarefa com o cliente | os dois | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` | |
| 5 | vence hoje | responsável | `Vence hoje: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` | |
| 6 | vence hoje | gestor | `Vence hoje: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. Prazo em 05/09/2026.` | ✏️ |
| 7 | vence hoje, tarefa em revisão | revisor | `Vence hoje: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` | ✏️ |
| 8 | vence hoje, tarefa com o cliente | os dois | `Vence hoje: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` | |
| 9 | venceu ontem | responsável | `Tarefa atrasada: Apuração ICMS — Frigobom` | `O prazo era 05/09/2026.` | |
| 10 | venceu ontem | gestor | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. O prazo era 05/09/2026.` | ✏️ |
| 11 | venceu ontem, tarefa em revisão | revisor | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` | ⚠️ ✏️ |
| 12 | venceu ontem, tarefa com o cliente | os dois | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` | ⚠️ |

✏️ falta acento · ⚠️ título e corpo se contradizem

O corpo é escolhido pela **primeira** condição que casa, nesta ordem: tarefa com o cliente →
destinatário é o revisor → venceu ontem → qualquer outro caso. É essa ordem que produz as
linhas 11 e 12: o marco é o último a ser olhado, então "atrasada" perde para as outras duas.

**Os campos que entram no texto**, e nada mais:

| Campo | Conteúdo | Vem de |
|---|---|---|
| título da tarefa | como está no quadro | `org_tasks.title` |
| data | prazo da tarefa, `dd/mm/aaaa` | `org_tasks.due_date` |
| nome | quem está com a tarefa, só no aviso do gestor | `profiles` (e-mail como reserva) |

Não entra nome de cliente, de projeto, de área, nem contagem.

## O que decidir

| # | Ponto | Como está hoje | Por que incomoda | Opções |
|---|---|---|---|---|
| 1 | **Acentos** | `Responsavel:` · `Aguardando sua revisao.` | Os títulos têm acento, o corpo não. É o mesmo defeito que a migração de 27/08 corrigiu nos avisos de tarefa e documento — voltou na família seguinte | Corrigir. Não tem outro lado |
| 2 | **Atrasada com corpo no futuro** (linhas 11 e 12) | `Tarefa atrasada: …` + `Prazo em 05/09/2026.` | Título e corpo se contradizem na mesma linha do sino. Não se resolve reescrevendo a frase: muda a **ordem** das condições | Marco vem antes de revisor/cliente · ou frase própria para atrasada + em revisão · ou não avisar atrasada quando está com o cliente |
| 3 | **Prefixo do gestor** | `Responsavel: Layara Souza. Prazo em 05/09/2026.` | Duas frases soltas emendadas. Nos avisos ao cliente a regra é uma frase que informa e contextualiza | Frase única (ex.: `Tarefa de Layara Souza, com prazo em 05/09/2026.`) · ou manter o prefixo |
| 4 | **Rótulo dos tipos novos no sino** | não existe: cai no genérico **"Aviso"** | O front tem um rótulo por tipo e não tem os dois novos. Hoje não quebra porque produção não tem os valores; no dia em que subir, a linha do sino fica sem nome — é o nome técnico vazando, por outro caminho | Rótulo para `tarefa_prazo_proximo` e para `tarefa_atrasada`, na altura de "Revisão pendente" e "Pendência em cobrança" |
| 5 | **Gestor recebe os três marcos** | sim, sobre a tarefa de todo mundo | Numa equipe grande é um aviso por tarefa por marco. Sino ruidoso faz a pessoa parar de olhar o sino, inclusive para o que importa | Manter os três · ou gestor só no atrasada · ou gestor só quando ninguém abriu o aviso anterior |
| 6 | **Título não diz o cliente** | só o título da tarefa | Duas tarefas de nome parecido em clientes diferentes ficam idênticas na linha do sino | Manter · ou acrescentar o cliente no título · ou pôr o cliente no corpo |

## Redação nova

Preencher aqui; o que estiver escrito manda, e vira migração. Título é por marco (uma coluna),
corpo é por variante.

### Títulos

| Marco | Título novo |
|---|---|
| 3 dias antes | |
| vence hoje | |
| venceu ontem | |

### Corpos

| Situação | Corpo novo |
|---|---|
| responsável, prazo à frente | |
| responsável, venceu ontem | |
| gestor, prazo à frente | |
| gestor, venceu ontem | |
| revisor, prazo à frente | |
| revisor, venceu ontem | |
| tarefa com o cliente, prazo à frente | |
| tarefa com o cliente, venceu ontem | |

### Rótulo na linha do sino

| Tipo | Rótulo novo |
|---|---|
| aviso de prazo próximo (3 dias antes e vence hoje) | |
| aviso de tarefa atrasada | |

### Decisões dos itens 5 e 6

| Ponto | Decisão |
|---|---|
| gestor recebe quais marcos | |
| título nomeia o cliente | |

## Referências

| Arquivo | O que tem |
|---|---|
| `supabase/migrations/20260901135620_ges01a_varredura_respeita_ambiente.sql` | versão vigente da leitura e da escrita — é dela que sai todo texto deste arquivo |
| `supabase/migrations/20260831202229_ges01a_tipos_de_aviso_de_prazo.sql` | os dois tipos novos do enum |
| `supabase/migrations/20260901144842_ges01a_ativar_cron_por_banco.sql` | o cron e o ambiente por banco |
| `src/lib/notificacoesInternas.ts` | rótulo e tom por tipo, e o destino do clique |
| [`avisos-cliente.md`](avisos-cliente.md) | os textos do cliente, e as regras de escrita da §"Como estes textos são escritos" — vale conferir quais valem aqui |
