# A cópia de "novo usuário cadastrado" deixa de ser do Ricardo, e vira também um espaço no Chat

**Pedido da Patrícia em 16/09/2026**, ao ver o e-mail
`[PSA - COPIA COORDENACAO] Novo usuário cadastrado: Mari Stela de Lourdes Redivo`.

Duas frentes, que compartilham a mesma origem:

- **A.** hoje a cópia é endereçada a uma pessoa. O corpo abre com "Olá, Ricardo!" e diz que o
  novo usuário "está vinculado à sua área". Deve chegar aos líderes, com texto que não cite
  nome. **Qual a melhor forma é a decisão desta tarefa** (D1).
- **B.** criar um espaço no Google Chat que avise a cada usuário cadastrado.

---

## De onde sai esse e-mail hoje

Não sai do banco e não sai de edge function. Sai do **front**, fire-and-forget, num POST para
o webhook do n8n, a constante `N8N_WELCOME_WEBHOOK` de [`src/lib/webhooks.ts`](../../src/lib/webhooks.ts),
com `event_type: 'user_created'`. Três pontos de chamada, todos vivos:

| onde | quando dispara | o que manda em `user_data` |
|---|---|---|
| `src/hooks/useTeamMemberMutations.ts:183` | criação pela tela `/equipe/acessos` | `roles` e `areas` marcados no formulário |
| `src/hooks/useSaveClientTransaction.ts:694` | representante que ganha acesso a chamados, no salvamento do cliente | `roles: ['client']` e `areas: []`, fixos no código |
| `src/lib/welcomeWebhookQueue.ts` (via `useCriarUsuariosRepresentantes`) | carga em lote da tela de Carga de Chamados, atrás de um interruptor | idem, em fila de 1 por vez |

O payload carrega `created_by` (é daí que sai o "CADASTRADO POR Anne Strini"), `created_at`,
`platform.login_url` e, atenção, `credentials.temporary_password`.

**O texto do e-mail, o destinatário e o "Olá, Ricardo!" não estão neste repositório.** Estão
dentro do fluxo do n8n. Nenhum commit daqui muda a saudação: quem muda é quem edita o fluxo.
O que o repositório controla é o **payload**, e é por ele que a mensagem passa a saber a área
de verdade e o ambiente de onde veio.

Conferido em produção em 16/09: `profiles` só tem o gatilho de `updated_at`, e o
`handle_new_user` de `auth.users` apenas insere o perfil e o papel `client`, sem nenhuma
chamada HTTP. Não existe database webhook no caminho. O front é a única origem.

O MCP do n8n respondeu 404 nesta sessão, então o fluxo não foi aberto. Ler o que ele faz hoje
é a T1.

## O que está medido em produção, 16/09/2026

| medida | número | consequência |
|---|---|---|
| Perfis criados em 30 / 90 dias | **6** / **13** | o aviso é raro, cerca de 1 por semana. Espaço no Chat não vira despejo |
| Perfis por mês, de maio a setembro | 8, 3, 2, 6, 4 | abril teve 33 e é a carga em lote de representantes, não o ritmo normal |
| Papéis desses 13 | 6 `client`, 4 `team_member`, 2 `lider`, 1 `sublider`, 1 `marketing` (o do Marketing tem dois papéis) | **quase metade é usuário do portal do cliente** |
| O usuário do e-mail que ela recebeu | papel `client`, **sem equipe e sem área** | a frase "está vinculado à sua área" é falsa justamente no caso mais comum |
| Quem tem papel de chefia | 13 `lider` + 5 `sublider`, mais 7 `admin` | "mandar para os líderes" são 18 caixas, se a lista vier do papel |
| Equipes ativas | 9, e **3 sem gestor**: Financeiro (Adm & Fin), Diretoria (Board) e Marketing | rotear pelo gestor da equipe deixa essas três sem ninguém, calado |
| `notificacao_canal` em produção | `sino, email, whatsapp` | o valor `google_chat` **não está lá**. O canal do Chat inteiro ainda é `develop` |

O Ricardo é gestor da equipe Fiscal, da área Tax. É a explicação mais provável para a cópia
ter nascido no nome dele, e o motivo de ela ter envelhecido: Tax tem quatro equipes, e
metade dos cadastros novos não é de Tax.

---

## Frente A · Para quem vai a cópia

### D1 · A lista de destinatários · **DECIDIDO em 16/09/2026**

**Decisão da Patrícia: a opção 1.** Cria-se o grupo `coordenacao@psaconsultores.com.br` no
Workspace, e o n8n passa a mandar a cópia para ele. As outras três ficam registradas abaixo
para não serem redescobertas.

| opção | o que é | custo | efeito colateral |
|---|---|---|---|
| **1. Um grupo do Workspace** (ex.: `coordenacao@psaconsultores.com.br`) | o n8n manda para um endereço só, e quem está no grupo se resolve no Workspace | um campo no n8n, zero código | quem entra e quem sai da coordenação deixa de ser assunto de TI |
| 2. Lista de papel (`lider` + `sublider`) | o fluxo consulta o banco e monta 18 destinatários | precisa de leitura do banco dentro do n8n, que hoje ele não faz | 18 caixas recebendo aviso de cadastro de portal de cliente |
| 3. Gestor da equipe do novo usuário | roteia pela estrutura, como a `notify-ticket` faz com `gestor_chamados_id` | o payload teria de mandar `equipe_ids`, que hoje não manda | **quebra em 3 das 9 equipes ativas** e em todo usuário `client`, que não tem equipe |
| 4. Só o espaço do Chat, sem e-mail de cópia | mata a frente A | zero | perde o registro na caixa de quem não abre o Chat |

A 1 é a única que não precisa de código para acompanhar mudança de coordenação, e a lista
fica onde já se administra gente. A 3 é a mais "certa" no papel e a que mais falha calada no
banco de hoje.

### Subtarefas

- **T0 · Criar o grupo `coordenacao@psaconsultores.com.br`.** Passo humano, no admin do
  Workspace, e é ele que destrava a T1. Três coisas a acertar na criação, todas dentro da
  mesma tela:
  - **Quem entra.** Os 13 `lider` e os 5 `sublider` do banco são o ponto de partida, não a
    resposta: o grupo é da coordenação, e quem decide a composição é ela. A lista medida está
    na seção acima.
  - **Quem pode postar.** Restrito à organização, senão o grupo vira endereço aberto. Quem
    manda é a conta que o n8n usa no Gmail, que é interna, então "membros da organização"
    basta e nada precisa ser liberado para fora.
  - **Fica fora do e-mail de boas-vindas.** O grupo recebe a cópia da coordenação, nunca o
    e-mail que vai para o novo usuário, que carrega senha.
- **T1 · Abrir o fluxo no n8n e registrar o que ele faz.** Destinatário, assunto, template, e
  se a cópia é um segundo e-mail ou uma cópia oculta do e-mail de boas-vindas. Sem isso todo
  o resto é chute. O MCP do n8n está fora do ar, então é passo humano.
- **T2 · O texto genérico.** "Olá, Ricardo!" vira "Olá!", e a frase "vinculado à sua área" só
  aparece quando houver área. Para usuário de portal, a mensagem diz o que ele é: acesso de
  cliente, com o cliente que o gerou.
- **T3 · O payload passa a dizer a área de verdade.** ⚠️ Mudança de contrato com o n8n. Hoje
  `areas` são as chaves de acesso a página do `AREA_CATEGORIES_MAP`, e não `estrutura_areas`.
  O vínculo que vale, `equipe_ids`, fica de fora do POST. Mandar equipe e área resolvidas por
  nome custa pouco, e é pré-requisito da opção 3 do D1.
- **T4 · Marcar a origem do disparo.** ⚠️ Ver B1. O campo `origem` da edge function
  `notificar` já existe como precedente, pelo mesmo motivo.
- **T5 · Decidir o assunto.** `[PSA - COPIA COORDENACAO]`, sem acento, é o que chega hoje. Se
  for para ficar, que fique acentuado.

## Frente B · O espaço no Chat

Dois caminhos, e eles não custam o mesmo.

**1. O próprio fluxo do n8n posta no espaço.** Um nó de Chat com a URL do webhook do espaço.
Funciona esta semana, não mexe em banco, e o dado já está na mão do fluxo.

**2. Pelo canal que a casa está construindo** (`notificacao` para `avisos_para_o_chat` para
`notificar-equipe`), descrito em [`planos/avisos-de-tarefa-no-google-chat.md`](../planos/avisos-de-tarefa-no-google-chat.md).
Custa: o valor `google_chat` em `notificacao_canal`, que ainda não está em produção; um valor
novo em `notificacao_tipo`; alguém escrevendo o evento em `notificacao`, o que hoje ninguém
faz para cadastro de usuário; e o mapa área-para-segredo, que não serve para um evento que
não tem área.

**Recomendada: a 1**, e sem culpa. O lema "o Chat espelha o sino" vale para aviso que já é do
sino. Cadastro de usuário não é, nunca foi, e forçá-lo para dentro do despachante paga três
migrações para ganhar um registro em `notificacao_envio` que ninguém pediu. Se um dia o
evento virar aviso do sino, ele migra.

- **T6 · Criar o espaço e o webhook no Workspace.** Passo humano. Nome sugerido: "PSA
  Coordenação", já que "PSA Chamados" mostrou que espaço por assunto funciona melhor que
  espaço por ferramenta.
- **T7 · O nó do Chat no fluxo.** Mensagem com nome, e-mail, papéis, equipe e área (ou
  "acesso de cliente"), e quem cadastrou.
- **T8 · A senha temporária não entra na mensagem.** O payload carrega
  `credentials.temporary_password`, e o espaço é coletivo. A cópia de hoje já não mostra a
  senha, e o espaço também não pode mostrar. Está escrito aqui porque o campo fica a um
  clique de distância dentro do editor do n8n.
- **T9 · Guarda de ambiente**, dependente da T4: o espaço só recebe o que veio de produção.

---

## Bugs achados no caminho

- **B1 · Sandbox e produção falam com o mesmo webhook.** `N8N_WELCOME_WEBHOOK` é constante de
  módulo, igual nas duas branches, sem recorte de ambiente. Criar um usuário de teste no
  sandbox dispara o e-mail real de boas-vindas, com senha, e a cópia real para a coordenação.
  Não dá para medir daqui quantas vezes isso já aconteceu, porque as execuções ficam no n8n.
  A correção é a T4 mais a T9, e vale para o e-mail tanto quanto para o Chat.
- **B2 · A frase da área mente para quase metade dos casos.** Ver a medição: 6 dos 13
  cadastros de 90 dias são `client`, sem área nenhuma, e recebem "está vinculado à sua área".
  Some com a T2.

## Aceite

1. Um usuário criado em `/equipe/acessos` gera cópia para `coordenacao@psaconsultores.com.br`,
   sem nome próprio no corpo, e uma mensagem no espaço do Chat.
2. Um representante criado pelo salvamento de cliente gera a mesma cópia, sem a frase de
   área, dizendo que é acesso de portal.
3. O mesmo cadastro feito com o app apontando para o sandbox não produz e-mail nem mensagem
   no espaço.
4. Nenhuma das duas mensagens contém senha.

## Para cadastrar na Lista de Tarefas

**Nome:** Aviso de usuário cadastrado: cópia para a coordenação e espaço no Chat

**Descrição:**

> O e-mail de usuário cadastrado hoje é endereçado ao Ricardo ("Olá, Ricardo!") e afirma que
> o novo usuário está vinculado à área dele. Passa a ir para o grupo
> `coordenacao@psaconsultores.com.br`, com texto sem nome próprio e sem a frase de área para
> quem não tem área (6 dos 13 cadastros dos últimos 90 dias são acesso de portal de cliente).
> Junto, um espaço no Google Chat recebe um aviso a cada cadastro, cerca de um por semana.
> O e-mail nasce no front, em três pontos, e é montado dentro do fluxo do n8n: a maior parte
> do trabalho é lá, e o repositório entra para mandar a equipe/área de verdade e a origem do
> disparo, que hoje não distingue sandbox de produção. Detalhe, medição e aceite em
> `docs/tarefas-a-executar/2026_09_16_copia-do-usuario-cadastrado.md`.

**Estimativa: 10 horas**, distribuídas assim:

| item | onde | horas |
|---|---|---|
| T0 criar o grupo da coordenação | admin do Workspace | 0,25 |
| T1 abrir o fluxo e registrar o que ele faz | n8n | 1 |
| T2 + T5 texto sem nome próprio, e o assunto | n8n | 1,25 |
| T3 payload com equipe e área resolvidas, nos três pontos de chamada, com teste | repositório | 3 |
| T4 campo de origem do disparo | repositório | 1 |
| T6 criar o espaço e o webhook | Workspace | 0,5 |
| T7 + T8 nó do Chat, mensagem, e a senha fora dela | n8n | 1,5 |
| T9 guarda de ambiente | n8n | 0,5 |
| Validação de ponta a ponta: cadastrar usuário de teste e conferir e-mail e espaço | os dois | 1 |

Cerca de 4 horas no repositório e 4 no n8n, mais os dois passos humanos no Workspace.

**A T1 é a incerteza.** O fluxo do n8n não pôde ser aberto na sessão que escreveu esta
tarefa, então a faixa honesta é de **8 a 13 horas**: se o e-mail de coordenação for um nó
separado, é mexer num lugar só; se for uma cópia oculta do e-mail de boas-vindas, o template
precisa ser partido em dois antes de qualquer outra coisa.

## Dependências

Nada aqui depende de migração, e é de propósito. A frente B pelo caminho 2 dependeria de o
canal do Chat chegar à produção, que é a tarefa 7 desta sprint e ainda não chegou.
