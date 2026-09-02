# Avisos de prazo de tarefa — textos do sino

Os avisos internos que a equipe recebe no sino sobre o prazo das suas tarefas (GES-01A). Este
arquivo é o **retrato do que o banco escreve hoje**, montado em 02/09/2026 para a revisão de
redação — o irmão interno do [`avisos-cliente.md`](avisos-cliente.md), que guarda os textos que
o cliente recebe.

> **A redação abaixo NUNCA passou por revisão.** Ela foi escrita junto com a varredura, em
> 31/08 e 01/09, como texto de trabalho. A migração que criou os tipos já registrava isso:
> *"os nomes descrevem o MARCO e não o texto da tela: o texto muda com a revisão da Patricia, o
> marco não."* Enquanto o texto for provisório, o nome do tipo no banco continua válido.
>
> **Está só no sandbox.** Produção tem os 13 valores antigos de `notificacao_tipo` — conferido
> em 02/09/2026 — sem `tarefa_prazo_proximo` nem `tarefa_atrasada`. A janela para reescrever
> antes de o texto chegar a alguém está aberta.

## Onde isso vive

| | |
|---|---|
| **Canal** | só sino (`notificacao_canal = 'sino'`). Não vai e-mail nem WhatsApp |
| **Quem escreve** | `alertar_tarefas_por_prazo(_hoje, _ambiente)`, que grava por `criar_notificacao()` |
| **Quem decide o destinatário** | `tarefas_a_alertar(_hoje, _ambiente)`, que não escreve nada |
| **Quando** | cron diário `alertar-tarefas-prazo-diario`, 11h UTC = 7h em Cuiabá, antes do dia de trabalho começar |
| **Onde aparece** | sino do cabeçalho, `NotificationPopover`; o clique abre a tarefa |
| **Rótulo e tom na linha do sino** | `src/lib/notificacoesInternas.ts` — **ainda sem entrada para os dois tipos novos**, ver "O que decidir", item 4 |

## Os três marcos

A régua é por igualdade de data, não por intervalo: cada tarefa é avisada em três dias
específicos, uma vez em cada.

| Marco | Dispara quando | `notificacao_tipo` | Título de hoje |
|---|---|---|---|
| `prazo_3_dias` | prazo é daqui a 3 dias (D-3) | `tarefa_prazo_proximo` | `Vence em 3 dias: {tarefa}` |
| `vence_hoje` | prazo é hoje (D-0) | `tarefa_prazo_proximo` | `Vence hoje: {tarefa}` |
| `atrasada` | prazo era ontem (D+1) | `tarefa_atrasada` | `Tarefa atrasada: {tarefa}` |

Fica de fora: tarefa concluída (`done`), tarefa em backlog e tarefa sem prazo. Passado o D+1,
não há mais aviso — a tarefa atrasada não volta a cobrar.

## Quem recebe cada aviso

Dois destinatários por tarefa, e o mesmo texto muda de corpo conforme o papel.

| Papel | Quem é | Observação |
|---|---|---|
| `responsavel` | quem está com a tarefa (`assigned_to`) | |
| `revisor` | o revisor (`reviewer_id`), **quando a tarefa está em revisão** | enquanto está em revisão, o aviso vai ao revisor **em vez** de ir a quem executou |
| `gestor` | gestor da equipe do projeto | recebe sobre a tarefa de qualquer pessoa da equipe, e o corpo dele abre dizendo de quem é |

## Como o texto é montado hoje

O corpo é escolhido pela **primeira** condição que casa, nesta ordem:

| Ordem | Condição | Corpo de hoje |
|---|---|---|
| 1 | tarefa aguardando o cliente (`waiting_client`) | `Aguardando o cliente. Prazo em {dd/mm/aaaa}.` |
| 2 | destinatário é o revisor | `Aguardando sua revisao. Prazo em {dd/mm/aaaa}.` |
| 3 | marco é `atrasada` | `O prazo era {dd/mm/aaaa}.` |
| 4 | qualquer outro caso | `Prazo em {dd/mm/aaaa}.` |

E, **só para o gestor**, o corpo é prefixado por `Responsavel: {nome}. ` — nome montado do
perfil, com o e-mail como reserva quando não há nome.

## O que a pessoa vê hoje, cenário preenchido

Tarefa **"Apuração ICMS — Frigobom"**, prazo **05/09/2026**, responsável **Layara Souza**,
revisora **Patrícia Melo**, gestor **Felipe Prado**.

### D-3 — três dias para o prazo

| Destinatário | Título | Corpo |
|---|---|---|
| Responsável | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` |
| Gestor | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. Prazo em 05/09/2026.` |
| Revisor (tarefa em revisão) | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` |
| Qualquer um, tarefa aguardando o cliente | `Vence em 3 dias: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` |

### D-0 — vence hoje

| Destinatário | Título | Corpo |
|---|---|---|
| Responsável | `Vence hoje: Apuração ICMS — Frigobom` | `Prazo em 05/09/2026.` |
| Gestor | `Vence hoje: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. Prazo em 05/09/2026.` |
| Revisor (tarefa em revisão) | `Vence hoje: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` |

### D+1 — atrasada

| Destinatário | Título | Corpo |
|---|---|---|
| Responsável | `Tarefa atrasada: Apuração ICMS — Frigobom` | `O prazo era 05/09/2026.` |
| Gestor | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Responsavel: Layara Souza. O prazo era 05/09/2026.` |
| Revisor (tarefa em revisão) | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando sua revisao. Prazo em 05/09/2026.` |
| Qualquer um, tarefa aguardando o cliente | `Tarefa atrasada: Apuração ICMS — Frigobom` | `Aguardando o cliente. Prazo em 05/09/2026.` |

## Os campos que o texto usa

| Campo | Conteúdo | De onde vem |
|---|---|---|
| `{tarefa}` | título da tarefa, como está no quadro | `org_tasks.title` |
| `{dd/mm/aaaa}` | prazo da tarefa | `org_tasks.due_date` |
| `{nome}` | nome de quem está com a tarefa, só no aviso do gestor | `profiles`, nome montado; e-mail como reserva |

Nada mais entra: não há nome de cliente, de projeto, de área nem contagem.

## O que decidir na revisão

**1. Os acentos.** Todo o corpo está sem acento: `Responsavel:`, `Aguardando sua revisao.`
Os títulos têm acento. É a mesma coisa que a migração
`20260827185245_acentos_nos_titulos_dos_avisos.sql` corrigiu nos avisos de tarefa e documento
em 27/08 — voltou a faltar na família seguinte.

**2. As duas últimas linhas do D+1 dizem "Prazo em" numa tarefa que já venceu.** A ordem das
condições resolve `waiting_client` e `revisor` antes de olhar o marco, então a tarefa atrasada
que está com o cliente, ou em revisão, ganha título de atrasada e corpo em tempo futuro. É o
ponto que eu levaria primeiro: título e corpo se contradizem na mesma linha do sino.

**3. O prefixo do gestor.** `Responsavel: Layara Souza. Prazo em 05/09/2026.` são duas frases
soltas emendadas. Se o padrão dos avisos ao cliente valer aqui — uma frase que informa e
contextualiza —, isso vira uma frase só.

**4. O rótulo dos dois tipos novos no sino.** A tabela de rótulos do front tem uma entrada por
tipo e não tem `tarefa_prazo_proximo` nem `tarefa_atrasada`; hoje isso não quebra porque
produção não tem os valores. No dia em que subirem, os dois caem no genérico e a linha do sino
diz **"Aviso"**. Precisa de rótulo e de tom — na altura de "Revisão pendente" e
"Pendência em cobrança", que já existem. É o mesmo defeito do nome técnico vazando que você
corrigiu em 27/08 (`Documento aprovado` → `Solicitação finalizada`), por outro caminho.

**5. Se o gestor deve receber os três marcos.** Hoje recebe. Numa equipe grande é um aviso por
tarefa por marco, e o sino do gestor pode virar ruído — o que faz a pessoa parar de olhar o
sino, inclusive para o que importa. Alternativa: gestor só no `atrasada`.

**6. Se o título deve nomear o cliente.** Hoje o título é só o da tarefa. Duas tarefas com
título parecido em clientes diferentes ficam idênticas na linha do sino.

## Redação nova

<!-- Espaço para a redação da Patricia. Um bloco por marco; o que estiver preenchido aqui
     manda, e vira migração. -->

### D-3 — três dias para o prazo

- **Título:**
- **Corpo, responsável:**
- **Corpo, gestor:**
- **Corpo, revisor:**
- **Corpo, aguardando o cliente:**

### D-0 — vence hoje

- **Título:**
- **Corpo, responsável:**
- **Corpo, gestor:**
- **Corpo, revisor:**
- **Corpo, aguardando o cliente:**

### D+1 — atrasada

- **Título:**
- **Corpo, responsável:**
- **Corpo, gestor:**
- **Corpo, revisor:**
- **Corpo, aguardando o cliente:**

### Rótulo na linha do sino

- **`tarefa_prazo_proximo`:**
- **`tarefa_atrasada`:**

## Referências

- `supabase/migrations/20260831202229_ges01a_tipos_de_aviso_de_prazo.sql` — os dois tipos.
- `supabase/migrations/20260901135620_ges01a_varredura_respeita_ambiente.sql` — a versão
  vigente da leitura e da escrita; é dela que sai todo texto deste arquivo.
- `supabase/migrations/20260901144842_ges01a_ativar_cron_por_banco.sql` — o cron e o ambiente
  por banco.
- `src/lib/notificacoesInternas.ts` — rótulo e tom por tipo, e o destino do clique.
- [`avisos-cliente.md`](avisos-cliente.md) — os textos do cliente, e as regras de escrita que
  valem lá ("Como estes textos são escritos"); vale conferir quais delas se aplicam aqui.
