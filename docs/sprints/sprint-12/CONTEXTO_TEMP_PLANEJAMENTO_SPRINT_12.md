# Contexto temporario - Planejamento da Sprint 12

> Documento de handoff temporario para retomada por outro agente sem acesso ao historico da conversa.

## Fonte principal do planejamento

O arquivo abaixo e o planejamento macro completo da Sprint 12 da OSG:

- `/home/bernardo/Documentos/planejamento_sprint_12_OSG`

Ele deve ser tratado como fonte inicial de todas as frentes da sprint, e nao apenas de Planejamento Tributario. O conteudo ainda esta em nivel macro e deve ser refinado gradualmente em tarefas executaveis.

## Objetivo da conversa

Iniciar a organizacao do planejamento macro da Sprint 12. A conversa comecou pela frente de Planejamento Tributario, cujo fluxo desejado e:

1. O Fiscal carrega um WP Excel de formato fixo.
2. O sistema extrai celulas e faixas predefinidas e persiste os resultados estruturados.
3. O sistema usa esses resultados para gerar as tabelas da secao tributaria de uma apresentacao PPTX.

Neste momento, o trabalho e somente de analise e planejamento. Nenhuma das features da Sprint 12 foi implementada nesta conversa.

Planejamento Tributario foi analisado em profundidade. Sucessao e Agrarios receberam analises macro suficientes para criar tarefas macro, mantendo o detalhamento funcional e tecnico dentro das tarefas futuras. As demais frentes abaixo foram apenas registradas a partir do arquivo-fonte e ainda precisam de investigacao, delimitacao de escopo e divisao em tarefas.

## Visao geral da Sprint 12

### 1. Planejamento Tributario

Fluxo macro proposto:

1. Mapear as celulas e faixas do WP fixo.
2. Carregar o WP, extrair os resultados e persisti-los em estrutura propria.
3. Gerar as tabelas da secao tributaria da apresentacao PPTX.

Esta foi a frente efetivamente analisada nesta conversa. Os detalhes tecnicos e as decisoes confirmadas estao registrados nas secoes seguintes deste documento.

### 2. Sucessao

#### Calculadora ITCMD

- Luana forneceu um WP com o calculo de tres cenarios de ITCMD e a apresentacao final correspondente.
- E necessario analisar as formulas da planilha e identificar os dados de entrada e os resultados.
- Depois, deve-se descobrir quais informacoes ja existem nos cadastros do sistema e quais exigirao novos campos ou entidades.
- O objetivo futuro e criar uma tela de calculadora para distribuir quotas entre as partes e automatizar os calculos.

#### Apresentacao ITCMD

- Com a calculadora concluida, gerar os slides a partir dos calculos estruturados.
- Essa etapa depende do mapeamento e da implementacao da calculadora.

Estado atual nesta conversa: analisado em nivel macro. Foram criadas duas tarefas macro, `SUC-01` para a calculadora e `SUC-02` para a apresentacao. A caracterizacao exata das formulas, das telas, das tabelas e dos gaps cadastrais faz parte da execucao de `SUC-01`, e nao deste planejamento preliminar.

Insumos analisados:

- `/home/bernardo/Downloads/Cópia de WP_Cálculo ITCMD_MT - revisado por Luana.xlsx`
- `/home/bernardo/Downloads/Apresentação_Eixo Sucessório Santa Terezinha_11.03.pptx`

Achados suficientes para embasar as tarefas:

- O WP possui cinco abas, quatro delas com formulas de cenarios sucessorios e tributarios.
- Foram identificadas aproximadamente 951 formulas no arquivo.
- O calculo envolve distribuicao de quotas, legitima e disponivel, usufruto, tres bases de avaliacao e tributacao progressiva por faixas de UPF/MT.
- As bases comparadas sao valor contabil, valor ITR/IPTU e valor de mercado.
- A apresentacao resultante possui 15 slides; os principais quadros calculados aparecem nos slides 9 a 12.
- Os quadros incluem resumo da doacao, reserva de usufruto, custos progressivos e comparacao dos tributos pelas diferentes bases.
- Existem diferencas entre alguns resultados armazenados no WP revisado e os valores apresentados no PPTX. A tarefa devera caracterizar a versao correta e homologar casos de referencia antes da implementacao definitiva.
- Algumas abas ocultas do workbook possuem referencias quebradas, indicando material historico ou cenarios intermediarios que nao devem ser copiados sem validacao.

Cadastros existentes que aparentam ser reutilizaveis, sujeitos a confirmacao durante `SUC-01`:

- `pessoa`: pessoas fisicas e juridicas, conjuges, filiacao, estado civil e regime de bens;
- `parentesco`: relacionamentos familiares;
- `bem`: valor contabil, valor ITR/IPTU, valor de mercado e empresa de destino;
- `movimentacao_quotas`: origem, destino, empresa, quantidade de quotas, percentuais e valores.

Ainda nao existem estruturas especificas de ITCMD, simulacao sucessoria, parametros de UPF/faixas ou resultados versionados. A definicao desses gaps faz parte de `SUC-01`.

### 3. Agrarios

#### Modelos de parceria e composse

- Alexandre preparou um mockup e documentacao de levantamento na branch remota `origin/ale-3-levantamento-contratos-rurais`.
- Sera necessario criar novas variaveis no motor de documentos.
- Sera necessaria uma nova seed de blocos para os contratos de parceria e composse usando essas variaveis.
- Tambem serao necessarios cadastros para os novos campos.

Estado atual nesta conversa: mockup analisado e escopo confirmado como fluxo completo, desde o cadastro ate a geracao dos contratos de parceria e composse. Foram criadas tres tarefas macro: `AGR-01`, `AGR-02` e `AGR-03`.

Leitura funcional do mockup:

- A tela proposta possui listagem de exploracoes e um modal com as abas `Dados`, `Imoveis e origens` e `Preview do contrato`.
- O cadastro reaproveita entidades existentes como Pessoa, Bem, Matricula, Titularidade, Cartorio, Administracao e documentos.
- Parceria possui um outorgante, varios exploradores e percentual agregado entre os lados.
- Composse possui varios compossuidores, fracoes que totalizam 100%, origem por imovel e regras proprias de administracao e liquidacao.
- A previa usa conceitos do motor documental existente, incluindo blocos condicionais e indicacao da origem dos valores.

Limites atuais do mockup:

- A listagem e os instrumentos de origem usam fixtures.
- O botao de salvar apenas fecha o modal.
- Nao existem persistencia, hooks de dominio, mutations, auditoria, RLS ou rota de producao para exploracao rural.
- Os blocos de parceria e composse existem como constantes TypeScript de preview, mas ainda nao como templates e blocos produtivos do motor documental.
- A selecao de documentos de origem ainda e um placeholder.

Decisao de divisao das tarefas:

- `AGR-01` - Implementar o cadastro persistido de parceria e composse rural com suas partes, imoveis e origens.
- `AGR-02` - Implementar variaveis, blocos, seed, previa e geracao do contrato de parceria rural.
- `AGR-03` - Implementar variaveis, blocos, seed, previa e geracao do contrato de composse rural.

As tarefas de contrato dependem do cadastro comum. O schema, os campos finais, as validacoes e a separacao exata entre dados persistidos e dados informados durante a geracao devem ser definidos durante a execucao das tarefas, sem detalhamento prematuro neste planejamento.

### 4. Governanca

Nota de decisao separada sobre a relacao entre Matriz de Alcadas e Alteracao Contratual:

- `docs/sprints/sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md`

Essa relacao permanece pendente e nao deve ser tratada como transformacao automatica 1:1 antes da decisao.

#### Modelo de acordo de quotistas

- Ja existe um mapeamento geral de campos dos documentos usados pela OSG.
- Falta obter a relacao exata entre os campos e os locais em que aparecem nos contratos.
- O acordo de quotistas aparenta ser um modelo contratual independente, com clausulas customizadas por cliente.
- Nao foi identificada ainda uma planilha ou outro documento estruturado usado como insumo para gerar o acordo.

#### Matriz de alcadas

- Analisar quais informacoes da matriz sao usadas na alteracao contratual.
- Mapear como essas informacoes aparecem no contrato e como se traduzem em alteracao do contrato social.

#### Protocolo de remuneracao

- Verificar se dados do protocolo alimentam algum contrato.
- Caso nao alimentem contratos, confirmar se o resultado e apenas uma planilha ou documento para assinatura.

Estado atual nesta conversa: nao analisado.

### 5. Gestao

#### Notificacoes gerenciais

- Alerta ao gestor quando um projeto ou tarefa estiver parado por mais de uma quantidade configurada de dias.
- Resumo semanal de pendencias em e-mail HTML customizado para o gestor.
- Varredura diaria de tarefas atrasadas e prazos proximos do vencimento.
- A rotina deve possuir deduplicacao para nao reenviar o mesmo aviso indevidamente.

#### Notificacoes OSG

- Ja existem gatilhos e envios por e-mail e WhatsApp para solicitacao aberta, documentos do checklist revisados ou recusados e conclusao da solicitacao inicial.
- A Sprint 12 nao cria esses eventos e nao reimplementa os canais existentes.
- A entrega nova reaproveita os mesmos gatilhos para acrescentar notificacao interna e registro no feed de cada projeto vinculado a OS.

O comportamento atual deve ser preservado sem regressao.

Estado atual nesta conversa: foram criadas tres tarefas macro, `GES-01`, `GES-02` e `GES-03`. Ha sobreposicao parcial com os avisos 9 e 15 da tarefa de notificacoes da Sprint 11. As tarefas da Sprint 12 devem verificar o que ja foi entregue e implementar somente o complemento necessario.

Divisao registrada:

- `GES-01` - Varredura diaria de projetos e tarefas, incluindo inatividade, atraso, prazo proximo e deduplicacao.
- `GES-02` - Resumo semanal de pendencias em e-mail HTML para os gestores.
- `GES-03` - Integrar os gatilhos de notificacao OSG ja existentes com as notificacoes internas e o feed de todos os projetos vinculados a OS.

O registro no feed dos projetos e parte obrigatoria de `GES-03`, nao apenas um efeito opcional das notificacoes.

### 6. Alteracoes Contratuais

- Alteracao contratual de variaveis de entidades, como endereco da sede e CPF.
- Doacao de quotas e alteracao contratual reflexa padronizadas em conjunto com o ITCMD.
- Integralizacao e concentracao de cotas, imovel adicional e tratamento de exigencia cartorial.
- Alteracao contratual reflexa do conselho e validacao do contrato contra os dados de governanca.

Estado atual nesta conversa: nao analisado. A integracao com ITCMD e Governanca indica dependencias entre frentes que precisam ser explicitadas antes da priorizacao.

### 7. Organizacao comercial

O arquivo-fonte contem o lembrete:

- separar tarefas de Planejamento Tributario e Anexo de Proposta.

O significado e o escopo do Anexo de Proposta ainda precisam ser esclarecidos antes de criar tarefas.

## Estado do planejamento em planilha

Foi criada a planilha:

- `docs/sprints/sprint-12/planejamento_sprint_12.xlsx`

Por enquanto, ela contem onze tarefas macro:

- `PT-01` - Mapear abas, linhas e colunas do WP.
- `PT-02` - Criar importacao, validacao e persistencia dos dados.
- `PT-03` - Gerar os slides tributarios em PPTX.
- `SUC-01` - Analisar e implementar a calculadora de ITCMD.
- `SUC-02` - Gerar a apresentacao de ITCMD a partir da calculadora.
- `AGR-01` - Implementar o cadastro de parceria e composse rural.
- `AGR-02` - Gerar contratos de parceria rural pelo motor documental.
- `AGR-03` - Gerar contratos de composse rural pelo motor documental.
- `GES-01` - Implantar a varredura diaria de projetos e tarefas.
- `GES-02` - Enviar resumo semanal de pendencias aos gestores.
- `GES-03` - Notificar eventos da OSG e registra-los nos feeds dos projetos da OS.

As demais frentes ainda nao foram adicionadas a planilha. Elas devem ser incluidas conforme forem discutidas e minimamente refinadas com o usuario.

## Planejamento Tributario - contexto detalhado

## Decisoes confirmadas

- O primeiro escopo suportara um modelo fixo de WP, e nao um importador generico de planilhas.
- FIAGRO nao faz parte do escopo.
- A planilha continuara sendo a fonte dos calculos tributarios no primeiro momento.
- O sistema devera importar os resultados calculados, e nao reimplementar todas as formulas tributarias agora.
- As tres macroetapas propostas inicialmente foram confirmadas:
  - mapear o WP;
  - importar e persistir;
  - gerar o PPTX.
- As tabelas da apresentacao analisada sao objetos nativos e editaveis do PowerPoint, nao imagens nem vinculos vivos com o Excel.

## Consequencias da exclusao de FIAGRO

Devem ficar fora do escopo inicial:

- a aba/cenario `Cenario Avaliado 02` como fonte funcional da feature;
- o slide de ITBI e custos de manutencao dos fundos;
- as colunas `PJxFIAGRO` do resumo tributario;
- qualquer calculo, narrativa ou diagrama especifico de FIAGRO, FIDC ou FIM-95.

O escopo deve se concentrar em:

- DRE projetada;
- comparacao `PFxPJ` versus `PJxPJ`;
- transferencia da atividade rural, quando aplicavel;
- resumo da tributacao sem as colunas de FIAGRO.

## Arquivos externos analisados

- `/home/bernardo/Downloads/WP_Família Lunardi_Planejamento Tributário.xlsx`
- `/home/bernardo/Downloads/Família Lunardi_Diagnóstico_06.2026.pptx`
- `/home/bernardo/Downloads/Grupo EDP_Relatório_Planejamento Tributário.pptx`
- `/home/bernardo/Downloads/VF_Apresentação_Potrich_Sucessão_Abril.2026 (2).pptx`
- `/home/bernardo/Downloads/Apresentação_Eixo Sucessório Santa Terezinha_11.03.pptx`
- `/home/bernardo/Downloads/Cópia de WP_Cálculo ITCMD_MT - revisado por Luana.xlsx`
- `/home/bernardo/Documentos/planejamento_sprint_12_OSG`

Os documentos Office tambem foram convertidos para PDF durante a analise em:

- `/tmp/opencode/planejamento-tributario/`

Arquivos em `/tmp` nao devem ser considerados permanentes.

## Estrutura identificada no WP Lunardi

O workbook possui as seguintes abas:

- `Resumo`
- `Cenario Atual`
- `Cenario Avaliado 01`
- `Cenario Avaliado 02`
- `Doc. Suporte >>>`
- `DRE Projetada`
- `LCDPR`
- `DRE AFLunardi`
- `Imoveis Explorados`
- `Bens da Atv Rural`
- `Dividas da Atv Rural`

Observacoes importantes:

- O arquivo possui aproximadamente 79 mil celulas preenchidas somente na aba `LCDPR`.
- A impressao integral gerou aproximadamente 623 paginas por incluir bases brutas.
- A importacao nao deve percorrer e persistir a planilha inteira sem necessidade.
- O WP possui cerca de 1.613 formulas, inclusive formulas com `XLOOKUP`.
- Bibliotecas JavaScript de XLSX leem resultados armazenados em cache, mas nao recalculam as formulas do Excel.

## Mapeamentos confirmados entre WP e PPTX

### DRE projetada

- O slide 15 da apresentacao Lunardi vem do bloco de DRE da aba `Cenario Atual`, iniciado aproximadamente em `B35`.
- Exemplos confirmados:
  - `Cenario Atual!D39` = receita 2026 das pessoas fisicas;
  - `Cenario Atual!E39` = receita 2026 da AFLunardi Agro;
  - os grupos dos anos seguintes usam as colunas `G:H` e `J:K`.

### Transferencia da atividade rural

- O slide 21 usa valores da aba `Cenario Avaliado 01`.
- Os valores de 2026 a 2028 aparecem aproximadamente em `D111:J117`.
- O slide tambem apresenta anos posteriores a 2028, mas esses anos nao existem nesse WP. Essa extensao foi calculada manualmente ou em outra fonte.
- A automacao inicial deve limitar-se aos anos formalmente existentes no WP, ate que a regra dos anos adicionais seja definida.

### Resumo da tributacao

- O slide 22 corresponde diretamente ao bloco `Resumo!B13:N39`.
- Como FIAGRO saiu do escopo, a extracao e o template final devem remover as colunas `PJxFIAGRO`.
- Permanecem os cenarios `PFxPJ` e `PJxPJ` para 2026, 2027 e 2028.

### Conteudo excluido pelo novo escopo

- O antigo slide 18 de FIAGRO era alimentado por `Cenario Avaliado 02` e por resultados do `Cenario Avaliado 01`.
- Esse mapeamento foi validado, mas nao deve virar tarefa funcional enquanto FIAGRO estiver fora do escopo.

## Limite de automacao observado

Boas candidatas a automacao completa:

- tabelas da DRE;
- tabela de transferencia da atividade rural para os anos existentes no WP;
- resumo da tributacao `PFxPJ` versus `PJxPJ`;
- nome do cliente, periodo e rotulos dos cenarios.

Conteudo provavelmente estatico ou semiautomatizado:

- textos regulatorios;
- conclusoes e recomendacoes escritas pelo consultor;
- diagramas dos cenarios;
- projecoes para anos nao calculados no WP;
- conteudo societario e sucessorio.

## Infraestrutura existente no repositorio

Pecas que podem ser reaproveitadas:

- Parser XLSX: `src/lib/excelImporter.ts`
- Dependencia XLSX: `xlsx@0.18.5` em `package.json`
- Upload de documentos da OSG: `src/hooks/useDocumentoArquivo.ts`
- Gerador PPTX: `supabase/functions/gerar-apresentacao/index.ts`
- Utilitarios OOXML: `supabase/functions/_shared/ooxml/`
- Relatorio atual de passagem OSG para Fiscal: `src/components/equipe/osg/relatorios/FiscalReport.tsx`

Lacunas identificadas:

- nao existem ainda as tabelas de persistencia de planejamento tributario;
- nao existe contrato versionado do modelo de WP;
- nao existe template tributario de PPTX no repositorio;
- nao existem testes golden-master da extracao do WP;
- nao existe historico de geracoes ligado ao arquivo de origem e ao snapshot importado.

## Risco tecnico principal

O sistema nao pode presumir que uma biblioteca XLSX recalculara as formulas. Para o MVP, a alternativa mais simples e:

1. exigir que o WP seja recalculado e salvo no Excel antes do upload;
2. ler os valores calculados armazenados no arquivo;
3. validar totais e consistencias importantes antes de persistir.

Uma solucao mais robusta no futuro seria recalcular o arquivo em backend com LibreOffice headless, provavelmente em Cloud Run. Edge Functions Deno nao oferecem esse runtime nativamente.

## Registro na planilha

As tres tarefas de Planejamento Tributario ja foram registradas em `docs/sprints/sprint-12/planejamento_sprint_12.xlsx`. A planilha registra FIAGRO explicitamente como fora do escopo.

## Proximos passos de Planejamento Tributario

1. Validar com o Fiscal quais linhas da DRE e do resumo devem aparecer no PPTX final.
2. Confirmar se o slide de transferencia da atividade rural entra no MVP.
3. Definir o contrato da versao inicial do WP: abas, celulas, tipos, anos e validacoes obrigatorias.
4. Definir comportamento de reimportacao: substituir estudo, criar revisao ou criar novo estudo.
5. Desenhar as tabelas de persistencia e o vinculo com cliente, projeto e documento de origem.
6. Obter ou preparar o template tributario oficial do PowerPoint sem FIAGRO.
7. Refinar `PT-01`, `PT-02` e `PT-03` em subtarefas somente depois dessas confirmacoes.

## Proximos passos gerais da Sprint 12

1. Escolher com o usuario qual frente sera analisada depois de Planejamento Tributario e Sucessao.
2. Para cada frente, localizar e analisar os insumos citados no arquivo-fonte antes de criar tarefas definitivas.
3. Comparar as notificacoes de Gestao com a Sprint 11 e registrar apenas o delta real.
4. Mapear dependencias cruzadas, especialmente ITCMD com Alteracoes Contratuais e Governanca com contratos.
5. Atualizar tanto este handoff quanto `planejamento_sprint_12.xlsx` conforme cada frente for refinada.

## Restricoes do repositorio para a futura implementacao

- Componentes React nao podem consultar Supabase diretamente; usar hooks de dominio.
- Toda operacao de criacao, atualizacao ou exclusao deve usar `useAuditLog` com diff campo a campo.
- Mudancas de schema devem seguir migration idempotente, aplicacao no sandbox e geracao oficial de tipos.
- Producao recebe mudancas de schema somente pelo fluxo humano do Lovable.
- Queries de entidades com `ambiente` devem aplicar o filtro correto.
- Leituras de tabelas com soft delete devem filtrar `excluido = false`.
- O arquivo autogerado `src/integrations/supabase/types.ts` nunca deve ser editado manualmente.
