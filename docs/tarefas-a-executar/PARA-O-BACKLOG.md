Arquivo pronto para o botão **Importar tarefas** de `/equipe/backlog`. Selecione **este arquivo
sozinho**, não a pasta: os arquivos de tarefa desta pasta também são importáveis um a um, e
escolher a pasta inteira traria cada tarefa duas vezes, com títulos diferentes.

Cada item traz o caminho do `.md` na descrição, para quem pegar a tarefa abrir a especificação
inteira. As prioridades vêm da medição, não de impressão — o motivo está escrito em cada uma.
O campo `projeto:` foi deixado em branco de propósito: nenhum dos 17 projetos cadastrados
corresponde a estas frentes, e valor que não casa vira aviso na tela de revisão. Atribua ali.

As horas só aparecem onde a tarefa escreveu um número. Inventar estimativa aqui estragaria a
conta que falta refazer com o Bernardo.

## A redação dos avisos de prazo vai para produção
prioridade: alta

Conferido em produção em 23/09/2026: o cron `alertar-tarefas-prazo-diario` está ATIVO e a função ainda manda o texto de trabalho — `Tarefa atrasada:` com corpo `Prazo em …`, no futuro. Toda manhã às 7h a equipe recebe o texto errado. A migration `20260902210245` já está escrita e mexe só em duas funções, nada de schema; falta o passo humano no chat do Lovable.

Arquivo: docs/tarefas-a-executar/2026_09_02_redacao-dos-avisos-de-prazo.md

## As exclusões da Estrutura do Cliente apagam mais do que dizem
prioridade: alta

Excluir um bem apaga em cascata os movimentos de quota pagos com ele, o que reescreve o capital social registrado, e o diálogo fala só de matrículas. Em produção o bem PS-BARR-01 tem 0 matrículas e 42 movimentos, e o diálogo dele diz "Nenhuma matrícula vinculada". Excluir uma pessoa lista um vínculo de sete e, para 19 titulares e 53 pessoas com movimento de quota, simplesmente falha imprimindo Postgres em inglês na tela. Quatro defeitos, oito subtarefas, três PRs sugeridos. Não mexe no banco.

Arquivo: docs/tarefas-a-executar/2026_09_23_exclusoes-que-apagam-mais-do-que-dizem.md

## As notificações que não estão rodando
prioridade: alta

O levantamento de 18/09 concluiu que cinco notificações não funcionam por falta de agendamento. A varredura contradiz metade disso: o cron de cobrança nasce desativado de propósito, porque a migration roda nos dois bancos e ativo cobraria cliente de dev no e-mail real. Medido em produção em 23/09: dos sete jobs, seis estão ativos e só `despachar-avisos-do-chat` está desativado. É job para ligar em produção, não código faltando.

Arquivo: docs/tarefas-a-executar/2026_09_22_crons-de-notificacao-em-producao.md

## A lista geral de solicitações de documentos
prioridade: média

Não existe tela que mostre todas as solicitações: a varredura achou uma única página citando solicitação, uma única leitura da tabela em todo o src/, sempre por cliente_id, e nenhuma view. Descobrir quais clientes têm solicitação e em que estado hoje exige abrir cliente por cliente. A leitura já é autorizada pela policy existente, então não há migração, RPC nem policy nova. O risco é ambiente: a tabela não tem a coluna e não está no ambienteScope, e uma lista que atravessa clientes mistura sandbox e produção sem recorte manual.

Arquivo: docs/tarefas-a-executar/2026_09_23_lista-geral-de-solicitacoes.md

## As cinco telas da Estrutura do Cliente falam a mesma língua
prioridade: média

Dez fatias de consistência saídas do teste de uso de 21/09: falha de consulta deixando de virar lista vazia, nome acessível em todo botão de ícone, o lápis saindo da coluna de Ações, a regra de elegibilidade do bem visível na lista, "Papel" com uma fonte só no lugar de quatro cópias, e o botão de criar no mesmo lugar nas cinco rotas. A especificação já foi aprovada por ela em 21/09 e não se reescreve no PR. Não mexe no banco. Fazer depois da tarefa das exclusões, que toca os mesmos dois arquivos.

Arquivo: docs/tarefas-a-executar/2026_09_23_consistencia-das-telas-de-estrutura-do-cliente.md

## O painel de notificações enviadas
prioridade: média

Pedido da Mariana em 18/09: não há painel central que mostre o que está rodando. A premissa estava meio errada, e isso encurta a tarefa — o painel por solicitação existe dentro do ModalAvisarCliente; o que falta é a visão de conjunto. A leitura já é autorizada. Tem uma decisão de produto antes do código: o painel é do Digital, mostrando o que falhou, ou do consultor, mostrando só o que chegou. A recomendação é o do Digital, porque o do consultor já existe.

Arquivo: docs/tarefas-a-executar/2026_09_22_painel-de-notificacoes-enviadas.md

## O histórico de solicitações de um cliente
prioridade: baixa

A busca faz limit(1) e traz só a ativa ou a última encerrada. Como o sistema cria quantas solicitações forem ao longo do tempo, as anteriores estão no banco sem porta na ferramenta. A T0 é medir quantos clientes têm mais de uma — essa medição pode encerrar a tarefa antes de virar trabalho. Tem decisão de produto antes do código: só informar que houve anteriores, ou navegar até elas.

Arquivo: docs/tarefas-a-executar/2026_09_23_historico-de-solicitacoes-do-cliente.md

## A OS passa a ser editável de qualquer tela
prioridade: média

A ordem de serviço é gravada num lugar só, dentro do useSaveClientTransaction de 1344 linhas, e não como hook de entidade: editar uma OS de outra tela hoje só duplicando a escrita. Extrair useUpsertOrdemServico e criar o OrdemServicoModal no molde do PessoaModal, que já é montado por cinco telas da OSG Work com uma escrita só. Rateio e produtos contratados entram no hook, cerca de 233 linhas a extrair. Começa por teste de caracterização.

Arquivo: docs/tarefas-a-executar/2026_09_16_os-editavel-de-qualquer-tela.md

## Levar ao Google Chat os avisos de coleta e as menções em comentário
prioridade: média

As duas frentes do sino que ficaram fora do canal do Chat e que já têm evento gravado: aviso de coleta, com o texto dela reusado tal e qual, e menção em comentário. Conferido em produção em 23/09: a função `avisos_para_o_chat` existe e não cita nenhum dos dois eventos. Chamado fica fora por decisão dela em 14/09, e revisão-pendente fica fora porque o sino a deriva do estado e não há evento para espelhar.

Arquivo: docs/tarefas-a-executar/2026_09_14_coleta-e-mencao-no-google-chat.md

## A cópia de novo usuário cadastrado sai do nome do Ricardo
prioridade: média
horas: 10

Pedido dela em 16/09 ao receber a cópia de coordenação. O e-mail abre com "Olá, Ricardo!" e diz "vinculado à sua área": vira texto sem nome próprio, endereçado ao grupo coordenacao@psaconsultores.com.br, e ganha um espaço no Chat. Criar o grupo é a T0. Medido em produção: 6 cadastros em 30 dias, e 6 dos 13 de 90 dias são client sem área nenhuma, ou seja, a frase da área mente com frequência. Não depende de migração.

Arquivo: docs/tarefas-a-executar/2026_09_16_copia-do-usuario-cadastrado.md

## Criar item de backlog por fora do app
prioridade: média

Uma edge function que exponha por HTTP o que o useCriarDemandasBacklog já faz por dentro, para que agente, script ou n8n criem item no backlog. Metade já existe: a tabela, o payload, a tela e o molde de autenticação. O problema de desenho não é a inserção, é a auditoria — o AGENTS.md exige useAuditLog em todo CUD, useAuditLog é hook React, e nenhuma edge function grava auditoria hoje. Se a subtarefa de auditoria for cortada por tempo, corte a tarefa inteira junto: porta de escrita sem trilha é pior que não ter porta.

Arquivo: docs/tarefas-a-executar/2026_09_22_criar-item-de-backlog-por-fora-do-app.md

## A IA não responde no sandbox
prioridade: média

O botão Ditar tarefas do backlog foi publicado no sandbox e respondeu 503, porque lá não há chave de IA. A chave do Lovable não pode ser obtida fora de um projeto do Lovable, e sete das nove funções de IA leem só ela; uma chave Anthropic própria destrava as outras duas, entre elas a de gerar demandas. Quatro opções e três decisões, com o Bernardo: qual opção, de quem é a chave, e se o mesmo provedor serve à transcrição de áudio.

Arquivo: docs/tarefas-a-executar/2026_09_23_chave-de-ia-no-sandbox.md

## O prefixo TESTE nos cadastros de dev
prioridade: baixa

Ele disse em 22/09 que ia tirar os prefixos porque o banco está separado; ela pediu uma conferência antes, que ninguém fez. A medição desmontou o risco técnico: ninguém no src/ filtra pelo texto do prefixo, os cinco usos são comentário, nenhuma migration o escreve, e o recorte de ambiente é por cliente.ambiente. O que se perde é a rede de segurança que o AGENTS.md descreve. A recomendação registrada é esconder o prefixo na renderização do feed em vez de remover do dado: responde ao incômodo sem perder o canário, e é reversível numa linha. A decisão é dela.

Arquivo: docs/tarefas-a-executar/2026_09_22_prefixo-teste-nos-cadastros-de-dev.md

## Nomenclaturas e tooltips do OSG Work: a conferência
prioridade: média

Percorrer as 20 rotas do OSG Work controle por controle, decidir o que muda e escrever o texto final, pela régua de geral/texto-explicativo-na-tela.md, em vigor desde 17/09. A unidade é o controle, não o arquivo, e "intervenção: nenhuma" é resultado válido — na rota /documentos, 14 dos 23 controles fecharam assim. Não começa do zero: três passadas já aconteceram e não se refazem, e 40 itens já estão levantados. Duas rotas estão sem dono, o hub e a calculadora de ITCMD. Seis decisões dela travam itens específicos, nenhuma trava a frente. Não mexe no banco, com uma exceção: as descrições dos modelos são dado de produção em tmpl_documento.descricao.

Arquivo: docs/tarefas-a-executar/2026_09_23_nomenclaturas-e-tooltips-conferencia.md

## Os campos novos da OS para o faturamento
prioridade: média

As quatro frentes que sobraram da validação do financeiro em 15/09: parcela com competência e vencimento — 16 das 155 OS são parceladas e ninguém sabe quando vencem —, texto que vai na NF, N contribuintes por OS com regra de divisão, e reembolso por tipo em tabela no lugar de duas colunas fixas. Bloqueada nas sete respostas da Letícia, enviadas em 15/09 e ainda sem retorno. Mexe no banco.

Arquivo: docs/tarefas-a-executar/2026_09_16_faturamento-campos-novos-da-os.md

## Notificações da coleta de documentos (OSG)
prioridade: média

Catálogo de 15 avisos para cliente, time e gestor, em quatro entregas: sino, botão de solicitar, aprovar e recusar, e varredura. Nenhuma das quatro foi iniciada. Cinco dos 15 avisos dependem de campo novo no banco, marcados na tarefa. O "como" é do tech lead. É a tarefa mais antiga ainda aberta, de 06/08/2026 — reconferir o escopo contra o que a coleta virou desde então antes de estimar.

Arquivo: docs/tarefas-a-executar/2026_08_06_notificacoes-da-coleta-de-documentos.md

## Pendências de validação TIP-02 e TIP-03
prioridade: média

Cinco pontos em que os anexos de ajuste das rotas do OSG Work divergiram da implementação, deixados em aberto de propósito em 18/09 em vez de resolvidos por inferência: se o rail de produtos deve mostrar só produtos com projeto criado, o texto do balão "Trazer para o checklist" e onde fica a consequência que ele informa, dois placeholders divergentes entre anexo e código, o nome fiscal GIA/DAR de ITCMD/ITCD a confirmar com a área fiscal, e a conferência visual do Diagnóstico Patrimonial.

Arquivo: docs/tarefas-a-executar/2026_09_18_pendencias-de-validacao-tip02-tip03.md

## Unificar o modelo de tarefa e conectar as telas do /equipe
prioridade: média

Parcialmente entregue: T1 e T6 concluídos e a tabela `tasks` já dropada. Seguem abertos T2 e T3, T4 e T5 — a conexão entre as telas do /equipe, que hoje não se falam. Documento de 21/07/2026; reconferir o que sobrou contra o /equipe de hoje antes de estimar.

Arquivo: docs/tarefas-a-executar/2026_07_21_unificar-modelo-de-tarefa-e-conectar-telas-do-equipe.md

## Atrito de uso no cadastro de clientes (Tax)
prioridade: média

Onze pontos de atrito (A1 a A11) e três bugs (B1 a B3), nenhum marcado como feito. A triagem de 01/09 confirmou que não há validação de CNPJ, UF ou e-mail no cadastro, ou seja, o grupo A parece intacto. Documento de 11/08/2026.

Arquivo: docs/tarefas-a-executar/2026_08_11_atrito-de-uso-no-cadastro-de-clientes.md

## O teto de instanciações do TypeScript
prioridade: alta

O `bun run typecheck` está vermelho na develop em quatro arquivos e nenhum deles tem defeito: o compilador estoura um teto global de 5 milhões de instanciações e desiste no arquivo em que estiver. O programa faz 8,24 milhões, e 43% disso é o tipo gerado do Supabase — sem ele, cabe. A recomendação medida é aplicar a fachada nos três arquivos quebrados agora, meia hora, que devolve o typecheck verde, e decidir depois entre dividir o programa em dois ou varrer as consultas. Varrer é o único caminho que devolve a tipagem inteira, e são cerca de 760 consultas: não cabe numa tarefa.

Arquivo: docs/tarefas-a-executar/2026_09_15_teto-de-instanciacoes-do-typescript.md

## Reduzir o custo de IA no repositório
prioridade: média

Diagnóstico de 13/07 comparando este repo com outro projeto interno: o Claude Code consome muito mais crédito aqui, e a causa não é a documentação, é a estrutura do código. T1, T3 e T4 já foram feitos. Seguem abertos T2 (duas migrations de import legado somando 26.916 linhas varridas em toda busca), T5 e T6 (o aceite "nenhum arquivo de UI acima de 600 linhas" ainda não é verdade — medido em 23/09: são 31) e T7 (criar o mapa de navegação módulo, pasta, página). Cada subtarefa tem esforço, impacto e aceite escritos.

Arquivo: docs/tarefas-a-executar/2026_07_13_reducao-de-custo-de-ia-no-repositorio.md

## Dívida técnica de RLS
prioridade: média

Auditoria somente-leitura do schema real, 138 tabelas, feita em 10/07 pelo Eduardo. O P1 inteiro foi fechado em produção e conferido policy por policy em 01/09: as 8 tabelas de melhorias, sistemas e justificativas já checam papel e cluster. O que sobrou no resto do schema continua aberto. Reconferir contra produção antes de estimar, porque parte da dívida é paga por fora do repositório e não deixa rastro aqui.

Arquivo: docs/tarefas-a-executar/2026_07_10_divida-tecnica-de-rls.md

## Dashboard Controle de uso e envio: trocar fixture por endpoint
prioridade: média

Os painéis técnico e gerencial estão construídos e rodando, mas com fixtures. Falta a troca fixture por endpoint da seção 6 do handoff. Depende de trabalho fora deste repositório: os dois endpoints GET são da engenharia de dados e estão especificados em docs/geral/spec-endpoints-analytics-uso.md, validados em 07/08 contra o banco de produção do Digital, uma query cada e sem mudança nas views.

Arquivo: docs/tarefas-a-executar/2026_08_07_dashboard-controle-de-uso-e-envio.md

## A conta do usuário em página própria
prioridade: média

Fase 1 entregue em 10/09: o cartão da barra lateral virou porta, e só o "Sair" entrou nele — "Trocar área" e "Voltar ao site" voltaram para o rodapé no mesmo dia, por decisão dela. Falta a fase 2: a página /conta com as abas Perfil e Segurança. Não precisa de migration, porque as colunas e o reautenticar() já existem. A alternativa foi escolhida por ela em 10/09 olhando maquete clicável das três opções.

Arquivo: docs/tarefas-a-executar/2026_09_10_conta-do-usuario-pagina-propria.md

## Melhorias do Feed
prioridade: média

Lista fechada em 21/09, saída da comparação entre o Slack da OSG, com 9 canais lidos no navegador, e a tela de Feed rodando. Oito itens ordenados por dor dividida por custo: escrever comentário direto do feed, que hoje só responde; busca textual; @todos; editar comentário e link permanente; pré-visualização de imagem; multi-seleção e intervalo de datas nos filtros; reações; e áudio. O que aparece no Slack mas pertence a outro lugar do sistema ficou de fora de propósito. Cada item diz onde mexer.

Arquivo: docs/tarefas-a-executar/2026_09_21_melhorias-do-feed.md

## Eliminar os warnings do ESLint
prioridade: baixa

Roadmap aberto com baseline de 791 warnings e zero erros, a maioria no-explicit-any. Fases 0 e 1 concluídas, fases 2 a 10 abertas. A contagem escrita no documento está vencida — ele parou em 763 e o número de hoje é outro. Meça com `bunx eslint . --cache` antes de citar qualquer número ou estimar a fatia.

Arquivo: docs/tarefas-a-executar/2026_07_10_eliminar-warnings-do-eslint.md

## Botões de edição cruzada no Digital MAPA
prioridade: baixa

Sempre que uma informação de outra página aparece na página atual, deve haver um botão de editar que abra o mesmo modal da página de origem, sem navegação. Parcialmente feito: a edição de melhoria já existe em ProcessosPage. Falta a ProjetosPage, que não tem nem procEmEdicao nem melEmEdicao. Escopo item a item no arquivo.

Arquivo: docs/tarefas-a-executar/2026_07_10_botoes-de-edicao-cruzada-no-mapa.md

## Tirar os casts de tipo dos hooks de comentário
prioridade: baixa

Dívida criada em julho de 2026, quando o types.ts ainda não conhecia org_comments_feed, criar_org_comment e org_comment_mentions. A causa acabou: o types.ts regerado em 31/08 já conhece as três. Os `as unknown as` em useDomainOrgComments, useDomainFeedComentarios e useNotificacoesMencao viraram peso morto e podem sair — é a única coisa que resta deste documento. Tarefa pequena, sem banco.

Arquivo: docs/tarefas-a-executar/2026_07_28_casts-de-tipo-nos-comentarios.md

## Resumo semanal de pendências aos gestores (GES-02)
prioridade: média

Um e-mail semanal por gestor, consolidando as pendências do escopo de responsabilidade dele sem duplicar os alertas individuais, com links que levam direto ao contexto de tratamento. Especificado em 31/08/2026 com entregáveis, dependências e seis critérios de aceite. Medido em 23/09: zero arquivos em src/ — nunca saiu do papel. A especificação é de agosto; remeça contra o produto de hoje antes de executar.

Arquivo: docs/sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md

## Indicadores gerenciais do sócio (GES-05)
prioridade: média

Duas metades: primeiro definir e homologar um conjunto pequeno de indicadores acionáveis, cada um com pergunta de negócio, fórmula, fonte, atualização, permissão e dono, encerrado por decisão formal de escopo; depois implementar o painel homologado. Indicador sem fonte confiável fica de fora, e não como número aproximado. Medido em 23/09: zero arquivos em src/. A especificação é de 31/08/2026.

Arquivo: docs/sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md

## Testamento como alternativa à doação (SUC-03)
prioridade: baixa

Duas metades: homologar o caminho e o modelo de testamento, e depois gerar o testamento pelo motor documental. Medido em 23/09: "testamento" aparece em dois arquivos do src/, os dois catálogos de tipo de documento — existe como item de checklist, nunca como fluxo. A especificação é de 31/08/2026 e precisa ser remedida contra o motor documental de hoje, que mudou muito desde então.

Arquivo: docs/sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md
