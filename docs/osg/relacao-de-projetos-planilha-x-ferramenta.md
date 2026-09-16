# Relação de Projetos da OSG: a planilha contra o que a ferramenta já tem

> Medido em 15/09/2026, contra **produção** (MCP do Lovable, só SELECT).
> Fonte: `Relação de Projetos - OSG.xlsx`, em
> `PSA Digital\03_Clientes_Internos\PSA_OSG\02_Mapeamento_Processos\P1 - Gestão de projetos e tarefas\00_Mapeamento_Ferramentas\05_Controle_de_Projetos\01_Documentacao`.
> Substitui em parte o `controle-projetos-compatibilidade-site-osg.md` que vive ao lado da planilha (07/07/2026), que a
> comparou com o **cadastro de cliente**. De lá pra cá o cadastro ganhou `observacoes` e o módulo de projetos entrou no
> ar, então os dois gaps que aquele documento apontou mudaram de tamanho. O detalhe coluna a coluna continua válido em
> `controle-projetos-estrutura-planilha.md`.

## 1. O grão é a única coisa que importa antes de qualquer campo

A planilha tem 67 linhas com nome de cliente, das quais **62 têm algum outro campo preenchido**, e 64 nomes distintos.
Uma linha é o **trabalho inteiro** que a OSG faz para uma família: um responsável, um gestor, um prazo, um código do
oneproject.

Na ferramenta, `org_projects` é **uma linha por produto contratado da OS**. Di Domenico Agronegócios tem quatro linhas
em produção (Governança, Planejamento Sucessório, Mediação de Conflitos, Estruturação Societária), todas com a mesma OS
(111/2026), as mesmas datas e o mesmo status. Na planilha, Di Domenico é uma linha só.

O número fecha a conta: são **33 projetos da OSG** em produção, e eles pertencem a **13 clientes**. A planilha
acompanha 62.

Quem tem o grão da planilha é a **OS**, não o projeto. Isso decide onde os campos que faltam precisam morar, e decide
também que a tela nova é uma lista de OS com os produtos dentro, não uma lista de `org_projects`.

## 2. O que já existe, e não deve ser criado de novo

**Os clientes já estão lá.** Dos 64 nomes distintos da planilha, **60 casam letra a letra** com um `cliente` do cluster
OSG em produção, e mais dois casam com o prefixo "Grupo " (Potrich - EDP e Potrich - Vanir). Sobram dois sem
correspondência óbvia: *Família Braga* (existe *Lindolfo Braga*) e *GB Agro* (existe *Gcb Agro*). O cluster OSG tem 204
vínculos de cliente; no ambiente `prod`, 85 ativos e 15 inativos.

**A região é o mesmo vocabulário.** A coluna G parece texto livre, mas os valores são exatamente os sete códigos que o
`ContratosTab.tsx` já oferece: "BA, GO, DF" é `BRA`, "Mapito, BR010, PA" é `MPT`, "Chapadão do Parecis, Região
Sucroalcooleira, Rondônia" é `PAR`, e assim por diante. 153 das 155 OS em produção já têm `regiao` preenchida. Só três
linhas fogem da lista, com "MT" e "PR", que não são praças e sim UF.

**Responsável e gestor cabem sem coluna nova.** `org_projects.leader_id` é o Líder Geral e `responsible_id` é o
Responsável Executor, os dois preenchidos nos 33 projetos da OSG. O formulário trabalha com `leader_ids` no plural,
persistido em `org_project_members`, então "Fernando/Elvis" (10 linhas da planilha) entra sem nada de novo. As iniciais
da coluna B (TS, AT, JG, LY, MD, EG, LC) viram pessoa de verdade.

**Hibernando tem casa e ninguém está usando.** `org_projects.status` aceita `on_hold`, o `projetoStatusColors.ts` já
desenha a pílula dele, e `OS_SITUACAO_TO_PROJECT_STATUS` traduz `suspenso` da OS para `on_hold` do projeto. Em produção
há **9 OS com `situacao = 'suspenso'`** e **zero projetos da OSG em `on_hold`**: os 33 estão todos em `active`. Não é
falta de campo, é falta de uso. O que há de discutível é o rótulo: a lista mostra "Pausado", e a equipe diz
"Hibernando".

**Observações do cliente também existe e também está vazio.** `cliente.observacoes` está no banco e na tela
(`ClienteTab.tsx:357`), inclusive com marca de pendência quando o cliente está inativo, que é exatamente o "por que
este cliente parou". Em produção: **0 preenchimentos**. O gap que o documento de julho levantou foi fechado e ninguém
encostou nele.

## 3. O que falta, com a tabela e o motivo

### 3.1. Código do oneproject, em `ordem_servico`

Coluna M. 52 das 62 linhas preenchidas têm o código, 50 distintos, 10 em branco. Nenhuma tabela da ferramenta guarda
isso, e a palavra "oneproject" não aparece uma vez no repositório.

Sem esse campo não dá para conferir a planilha contra a ferramenta, nem para importar as 62 linhas sem casar tudo por
nome. É a única chave de junção que existe entre os dois lados.

Vai em `ordem_servico`, não em `org_projects`, e o motivo está no §1: Di Domenico tem quatro `org_projects` e um código
só na planilha. Se o campo ficasse no projeto, as quatro linhas repetiriam o mesmo valor, e o primeiro que divergisse
não teria como ser detectado. A própria planilha já prova que o código é do grão maior, porque Potrich - EDP e
Potrich - Vanir compartilham o 1773, e as duas Novafertil compartilham o 2016.

Coluna aditiva, `text`, nullable. Barata.

### 3.2. Papel do cluster no cliente, em `cliente_clusters`

Colunas H (Área Líder) e I (Área Tax). A planilha diz duas coisas por linha: quem lidera o trabalho e qual área
tributária atende. A ferramenta tem `cliente_clusters`, que é N:N sem papel nenhum. **51 clientes em produção já têm
mais de um cluster**, e hoje não existe jeito de saber qual deles lidera.

Os valores de H casam quase todos com cluster que já existe: FB é *Familly Business* (19 linhas), OSG é *OSG* (17),
PSA Norte é *PSA Norte* (14), Legal provavelmente é *Prado Advogados* (1), PSA Consultores provavelmente é
*PSA Prado Suzuki* (1). **PSA Sinop (3 linhas) não existe como cluster em produção.**

A coluna I tem 38 preenchimentos em três valores: Norte (20), Consultores (10) e PSA Norte (8). "Norte" e "PSA Norte"
provavelmente são o mesmo cluster escrito de dois jeitos, o que reduz I a dois valores reais.

Uma coisa que eu achei que resolvia e não resolve: `ordem_servico.cluster_id` (o campo "Empresa / Faturamento") está
preenchido em 89 das 95 OS da OSG, e parecia ser a Área Líder pronta. Conferi em 14 OS de clientes que estão nos dois
lados, e ele é sempre **OSG ou TAX**, nunca FB, PSA Norte ou PSA Sinop. Di Domenico tem `cluster_id = OSG` na OS e a
planilha diz Área Líder = PSA Norte; Família Lunardi tem OSG na OS e PSA Sinop na planilha. São perguntas diferentes:
o `cluster_id` diz qual área da PSA vendeu a OS, e a coluna H diz qual unidade toca o trabalho.

Duas ressalvas antes de mexer aqui, e são sérias. `cliente_clusters` é a tabela que a RLS usa para recortar quem vê
quem, e o `docs/rls/Divida_Tecnica_RLS_Eduardo.md` registra três policies `ALL` convivendo com o CRUD separado nela. E
PSA Sinop virar cluster tem a condição de a Equipe Sinop não perder TAX. O raio dessa coluna é maior que o das outras.

### 3.3. O bloco de governança, em tabela nova

Colunas D (Pendência Governança), E (Minutas a serem feitas) e F (Status formalização). Foi aqui que eu procurei mais
para não criar tabela, e não achei.

O que existe perto não serve. `checklist_cliente_item` (533 itens em produção) é **coleta**, documento que o cliente
entrega; os dois `documento_tipo` que casam pelo nome são "Matriz de alçadas existente" e "Protocolo/acordo societário
ou familiar", os dois no sentido de recolher o que já existe, e minuta a fazer é o contrário. `documento_gerado` tem
**8 linhas** em produção inteira, então não dá para derivar "o que falta minutar" da ausência de documento gerado. E o
módulo de governança (`orgao_governanca`, `papel_governanca`, `matriz_alcadas`) está construído e **zerado**: zero
clientes com órgão, zero com matriz. Ele guarda o conteúdo da governança, não o acompanhamento dela.

A coluna E, olhando os valores reais, é uma lista curta e repetida: Acordo Societário, Protocolo de Remuneração,
Matriz de Alçadas. Isso é checklist de três itens por cliente, com estado, não texto livre. A coluna D é o resumo
booleano desse checklist (Sim aparece 24 vezes, Não se aplica 16) e a F é o andamento da formalização depois que a
minuta ficou pronta.

Proposta: uma tabela `governanca_pendencia`, no grão de **cliente** (o mesmo da planilha e o mesmo de
`orgao_governanca`), com o tipo de minuta, o estado e uma nota. D deixa de ser campo e passa a ser contagem, o que
elimina de saída as quatro grafias de "Não se aplica" que a planilha tem hoje.

Fica uma decisão aberta: F é estado do checklist inteiro ou de cada minuta? Os textos da planilha ("Enviados para
Formalização Reforma do Estatuto", "Falta formalizar acordo e matriz de alçadas") apontam para cada minuta, mas 15 das
56 linhas preenchidas dizem só "Pendente", que é o checklist inteiro.

### 3.4. Status Atual e observação, sem campo novo

Coluna N, e ela é observação. Isso resolve sozinho: `ordem_servico.observacoes` já existe, e o grão bate com o da
planilha (§1). São 57 das 62 linhas preenchidas na planilha, com média de 113 caracteres e a maior com 486, e o campo
aguenta.

Em produção, 3 das 95 OS da OSG têm `observacoes`. Não falta campo, falta o texto ser digitado ali em vez de na
planilha.

Eu tinha proposto mandar isso para `org_comments`, pelo argumento de que texto livre envelhece sem data e sem autor.
O argumento continua de pé para o andamento do trabalho, e o Feed serve para isso, mas não é o que a coluna N é.

## 4. Onde a tela mora

**Em `/equipe/osg/projetos`, não em Gerencial.**

O argumento que decide é acesso. `/equipe/osg/gerencial` está atrás de `LiderRoute`, que é líder para cima. Quem
preenche a planilha hoje são TS (16 linhas), AT (13), JG (13), LY (9), MD (4), EG (2) e LC (1), e nenhum deles é
gestor. Pôr a Relação de Projetos em Gerencial tira da tela justamente as sete pessoas que a alimentam, e sobra uma
lista que só os dois gestores abrem e ninguém atualiza.

O segundo argumento é o que Gerencial já é: `OsgGerencial` monta `DashboardEmbedView` com o dashboard de Clientes e OS
mais os relatórios do Looker. É agregado, gráfico, número por mês. A Relação de Projetos é nominal, linha por cliente,
para achar um cliente e ver onde ele está.

Concretamente: `/equipe/osg/projetos/relacao`, terceiro item do grupo Projetos do `OsgLayout`, ao lado de Clientes e
Projetos e tarefas. Lista de OS com os produtos dentro, com filtro por Situação, Área Líder e Equipe.

Isso não impede o dashboard. Quando a Relação estiver preenchida, "quantos hibernando por área" vira um card de
Gerencial em cima do mesmo dado, sem duplicar a tela.

## 5. O que a planilha tem que não entra assim

A coluna C (Gestor) tem **5 linhas com o valor "Finalizado"**, que é situação e vazou do campo errado. A coluna D tem
`Não se aplica`, `Não de aplica`, `N/A` e `Não` querendo dizer a mesma coisa, e uma linha com "Finalizado" também.
Três linhas usam "S/D" na Equipe OSG. Dez linhas não têm código do projeto, e dois códigos aparecem duas vezes.

Nenhuma dessas grafias sobrevive a um campo com lista fechada, que é o ponto: o trabalho de higiene é o mesmo trabalho
de migrar.

## 6. Um achado fora do escopo

`ordem_servico` **não tem a coluna `excluido` em produção**. O `docs/rls/mapa-do-banco.md` lista `excluido` entre as
flags dela, e o filtro `.eq('excluido', false)` que o AGENTS.md manda usar em leitura quebraria a query. A divergência
é entre o `types.ts` da branch e o schema de produção, e vale conferir se alguma migration parada é essa.
