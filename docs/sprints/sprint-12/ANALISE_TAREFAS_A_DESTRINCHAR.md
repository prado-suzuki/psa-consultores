# Análise das tarefas a destrinchar - Sprint 12

## Escopo desta análise

Este documento refina somente `SUC-01`, `SUC-03`, `GES-01`, `GES-02`, `GES-04`, `GES-05`, `AC-01`, `AC-03` e `SLD-01`, conforme o planejamento em `planejamento_sprint_12.xlsx`.

Não foram retrabalhadas as tarefas já consideradas especificáveis: `PT-01`, `PT-02`, `PT-03`, `PT-04`, `SUC-02`, `AGR-01`, `AGR-02`, `AGR-03`, `AC-02` e `GES-03`.

Fontes consideradas:

- `docs/sprints/sprint-12/planejamento_sprint_12.xlsx`;
- `docs/sprints/sprint-12/CONTEXTO_TEMP_PLANEJAMENTO_SPRINT_12.md`;
- `docs/sprints/sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md`;
- `docs/sprints/sprint-11/TAREFA_notificacoes-coleta-documentos.md`;
- `docs/planos/notificacoes-osg-coleta-documentos.md`;
- documentação de arquitetura do motor de documentos em `docs/osg/`;
- estado atual da infraestrutura de notificações e geração documental no repositório.

## Decisões transversais

- Uma tarefa que mistura descoberta, homologação de regra e implementação foi dividida. A descoberta pode ser uma entrega de Sprint quando termina em contrato funcional testável, e não apenas em notas abertas.
- Alteração Contratual deve evoluir por evento societário homologado. Não é seguro tratar `AC-01` ou `AC-03` como um gerador genérico em uma única tarefa.
- A infraestrutura atual já possui caixa interna de notificações, registro de envios, idempotência e canais externos. Não foram localizadas, porém, as automações específicas dos avisos 8, 9 e 15. Antes de implementar Gestão, deve-se conferir a branch alvo e os critérios da Sprint 11 para evitar trabalho duplicado.
- A deduplicação de alertas temporais deve representar a ocorrência de negócio, e não apenas “já enviou hoje”. A mesma ocorrência não pode reaparecer diariamente; uma nova ocorrência só nasce após regularização e nova violação, ou em marcos de régua explicitamente aprovados.
- `SLD-01` é uma capacidade técnica comum. `PT-03` e `SUC-02` continuam sendo as entregas funcionais das apresentações e não devem ser absorvidas ou duplicadas por ela.
- Toda mudança de schema indicada abaixo segue o fluxo de migration no sandbox e aplicação humana em produção descrito no `AGENTS.md`.

## Visão recomendada do backlog

| Item atual | Tratamento recomendado | Recorte candidato à Sprint 12 |
|---|---|---|
| `SUC-01` | Transformar em épico e dividir em `SUC-01A`, `SUC-01B` e `SUC-01C` | `SUC-01A`; as seguintes entram apenas se a regra for homologada a tempo |
| `SUC-03` | Dividir em `SUC-03A` e `SUC-03B` | `SUC-03A`, salvo se o modelo jurídico já estiver homologado |
| `GES-01` | Dividir alertas de prazo e inatividade em `GES-01A` e `GES-01B` | Ambos cabem separadamente, após checagem do aviso 9 |
| `GES-02` | Manter uma tarefa, condicional ao delta do aviso 15 | Executar somente se o aviso 15 não estiver entregue |
| `GES-04` | Manter uma tarefa após fechar a régua de cobrança | Executável após a decisão da régua e do conceito de resposta |
| `GES-05` | Transformar em épico e dividir em `GES-05A` e `GES-05B` | Somente `GES-05A` tem escopo firme hoje |
| `AC-01` | Transformar em épico e dividir em `AC-01A`, `AC-01B` e `AC-01C` | `AC-01A` e, se homologado, um único caso entre `AC-01B` e `AC-01C` |
| `AC-03` | Transformar em épico e dividir em `AC-03A` a `AC-03D` | `AC-03A`; no máximo um evento documental depois da homologação |
| `SLD-01` | Reduzir à fundação comum `SLD-01A` | `SLD-01A`, sem repetir a geração de `PT-03` ou `SUC-02` |

## SUC-01 - Calculadora de ITCMD

### Diagnóstico

O item atual reúne três trabalhos com riscos e critérios de conclusão diferentes: caracterizar cerca de 951 fórmulas e divergências entre WP e PPTX, criar o domínio persistido de simulação e implementar a calculadora. A aceitação atual depende de “casos homologados”, mas a própria tarefa também teria de produzi-los. Assim, `SUC-01` deve funcionar como épico.

### `SUC-01A` - Homologar o modelo de cálculo de ITCMD/MT

**Recorte executável para Sprint:** caracterizar e homologar os três cenários do WP revisado, sem construir ainda a tela definitiva.

**Objetivo:** converter o workbook em uma especificação determinística de entradas, etapas, fórmulas, arredondamentos, faixas de UPF/MT, saídas e invariantes.

**Entregáveis:**

- mapa de abas, células, fórmulas e dependências relevantes;
- dicionário de entradas, saídas e unidades;
- regra de distribuição de quotas, legítima, disponível, usufruto e bases de avaliação;
- tabela versionada dos parâmetros externos usados no caso de referência, com fonte e vigência;
- explicação e decisão sobre cada divergência entre WP e apresentação;
- casos golden-master aprovados pela OSG, cobrindo os três cenários e as três bases de avaliação;
- mapa de dados já existentes em `pessoa`, `parentesco`, `bem` e `movimentacao_quotas`, além dos gaps cadastrais.

**Dependências:** WP revisado por Luana; apresentação Santa Terezinha; disponibilidade de responsável funcional/jurídico para homologar divergências; fonte oficial dos parâmetros de MT.

**Critérios de aceite:**

1. Toda saída que entrará na calculadora possui origem e fórmula rastreáveis.
2. Os casos de referência possuem entradas e resultados esperados congelados.
3. As diferenças entre WP e PPTX estão resolvidas por decisão registrada, sem escolher silenciosamente um dos valores.
4. Entradas manuais, dados reaproveitados e parâmetros externos estão classificados.
5. O cálculo pode ser reimplementado sem consultar visualmente o workbook.

**Fora de escopo:** interface final; persistência de produção; geração do PPTX; outras UFs; copiar as abas ocultas ou referências quebradas; alterar cadastros antes de fechar os gaps.

### `SUC-01B` - Implementar o domínio e o motor da simulação ITCMD/MT

**Recorte executável para Sprint:** implementar o cálculo puro e a persistência versionada com base exclusiva na especificação homologada em `SUC-01A`.

**Objetivo:** produzir simulações reproduzíveis, ligadas ao cliente e às fontes cadastrais usadas, sem depender do Excel em tempo de execução.

**Entregáveis:**

- **⚠️ MIGRAÇÃO:** estruturas de simulação, participantes, distribuição, parâmetros e resultados versionados;
- contrato de dados entre cadastros, motor e futuras apresentações/alterações contratuais;
- funções puras do cálculo com testes golden-master;
- hooks de domínio para criar, revisar, consultar e comparar simulações;
- snapshot das entradas e da versão das regras em cada revisão;
- auditoria das operações de criação e alteração.

**Dependências:** conclusão de `SUC-01A`; decisões de reuso versus novos campos; migration e tipos gerados antes do código consumidor.

**Critérios de aceite:**

1. O motor reproduz os casos homologados dentro da tolerância e do arredondamento definidos.
2. Uma revisão antiga continua reproduzível após mudança cadastral ou atualização de parâmetro.
3. Resultados guardam rastreabilidade até entradas, regra e versão da simulação.
4. Estados inválidos, como soma de quotas ou disponível incompatível, são recusados com erro de domínio.

**Fora de escopo:** tela completa; PPTX; edição de fórmulas pelo usuário; outras UFs; instrumento de doação ou testamento.

### `SUC-01C` - Entregar a experiência da calculadora

**Recorte executável para Sprint:** montar, revisar, comparar e aprovar simulações usando o domínio de `SUC-01B`.

**Objetivo:** permitir que a OSG distribua quotas entre partes, compare os cenários homologados e escolha uma revisão como resultado do estudo.

**Entregáveis:**

- seleção das pessoas, bens, empresas e valores reaproveitáveis;
- edição das entradas próprias da simulação;
- distribuição de quotas com validações e totais visíveis;
- comparação dos cenários e bases aprovados;
- estados de rascunho, calculado e aprovado, com histórico de revisões;
- indicação clara de dado cadastral, parâmetro e valor informado na simulação.

**Dependências:** `SUC-01B`; definição de quem pode aprovar; cadastros mínimos completos.

**Critérios de aceite:**

1. Um caso homologado é montado e aprovado sem editar banco ou planilha.
2. Alterar uma entrada gera nova revisão ou invalida explicitamente a aprovação anterior.
3. A tela impede aprovação enquanto houver inconsistência de quotas, partes ou valores obrigatórios.
4. A revisão aprovada fica disponível, por contrato estável, para `SUC-02`, `AC-02` e `SUC-03`.

**Fora de escopo:** geração de documentos; cadastro genérico de patrimônio; workflow de guia de ITCMD; regras de outras UFs.

## SUC-03 - Testamento como alternativa à doação

### Diagnóstico

O texto atual mistura a decisão sucessória, a doação com usufruto e a geração do testamento. A doação e sua AC reflexa já pertencem a `AC-02`. `SUC-03` deve cuidar somente da caracterização e geração do caminho testamentário; a escolha do cenário deve ser persistida pela calculadora.

### `SUC-03A` - Homologar o caminho e o modelo de testamento

**Recorte executável para Sprint:** mapear um tipo testamentário e um caso real representativo.

**Objetivo:** definir quando o caminho testamentário é aplicável e quais dados e decisões são necessários para gerar o instrumento.

**Entregáveis:** modelo jurídico homologado; mapa de partes, bens, legados, legítima/disponível, disposições e signatários; regras condicionais; contrato de entrada vindo da simulação; lista de dados manuais e gaps cadastrais; caso golden-master.

**Dependências:** resultado aprovado de `SUC-01`; modelo oficial; validação jurídica; definição da modalidade testamentária inicial.

**Critérios de aceite:**

1. A modalidade inicial e suas hipóteses de uso estão explicitadas.
2. Cada variável e cláusula condicional possui origem definida.
3. O caso de referência possui documento esperado homologado.
4. Está claro quais resultados da calculadora são informativos e quais vinculam o documento.

**Fora de escopo:** implementar doação; inventário; modalidades testamentárias adicionais; protocolo em cartório; geração do documento.

### `SUC-03B` - Gerar o testamento pelo motor documental

**Recorte executável para Sprint:** gerar a modalidade e o caso homologados em `SUC-03A`.

**Objetivo:** produzir e versionar o testamento a partir da revisão sucessória escolhida e dos complementos jurídicos previstos.

**Entregáveis:** variáveis e blocos do motor; template versionado; seleção da revisão sucessória; validação de pendências; prévia e documento final; vínculo entre documento, cliente, projeto e simulação.

**Dependências:** `SUC-03A`; infraestrutura do motor documental; suporte aos papéis e signatários exigidos pelo modelo.

**Critérios de aceite:**

1. O caso golden-master gera documento completo sem ajuste manual posterior.
2. Pessoas, bens, percentuais e disposições coincidem com a revisão selecionada.
3. Uma nova revisão da simulação não altera silenciosamente documento já gerado.
4. A interface distingue claramente testamento de doação, sem duplicar a geração de `AC-02`.

**Fora de escopo:** cálculo de ITCMD no gerador; doação e AC reflexa; inventário; outras modalidades não homologadas.

## GES-01 - Varredura diária de projetos e tarefas

### Sobreposição com o aviso 9 da Sprint 11

O aviso 9 já define “tarefa com prazo estourado”, para o time, no sino, por varredura. Portanto, a parte de tarefa atrasada de `GES-01` não é uma nova feature. Na branch analisada existe a infraestrutura de sino e deduplicação, mas não foi localizada a varredura de `org_tasks` que entregue esse aviso.

Regra de planejamento:

- se o aviso 9 estiver entregue na branch que iniciar a Sprint 12, `GES-01A` implementa somente prazo próximo e eventuais ajustes de destinatário/encerramento;
- se não estiver entregue, o aviso 9 migra para `GES-01A` e sai do saldo da Sprint 11, sem duas tarefas para a mesma entrega;
- inatividade é regra nova e permanece em `GES-01B`.

### `GES-01A` - Alertar tarefas atrasadas e próximas do prazo

**Recorte executável para Sprint:** tarefas abertas com `due_date`, sem incluir ainda “projeto parado”.

**Objetivo:** avisar o responsável e, conforme regra aprovada, o gestor quando uma tarefa entrar em janela de atenção ou atraso.

**Entregáveis:** inventário do aviso 9 na branch alvo; definição das janelas; rotina diária; notificação interna com link; chave de ocorrência; registro do envio; encerramento da ocorrência quando a tarefa for concluída ou o prazo mudar; testes de fronteira de data e fuso.

**Dependências:** definição do destinatário de escalonamento; janela de “próximo do prazo”; status que contam como abertos; agendador; infraestrutura atual de notificações.

**Critérios de aceite:**

1. Cada tarefa elegível gera no máximo um aviso por marco aprovado, não um aviso diário indefinido.
2. Tarefa concluída, cancelada ou com prazo futuro deixa de aparecer como ocorrência ativa.
3. Mudança de prazo é tratada sem manter alerta falso e sem apagar o histórico.
4. O link abre a tarefa no ambiente correto.
5. O aviso 9 não fica implementado em dois jobs distintos.

**Fora de escopo:** projeto/tarefa sem movimentação; e-mail semanal; chamados; preferências individuais; redefinir o cálculo dos dashboards.

### `GES-01B` - Alertar inatividade de projetos e tarefas

**Recorte executável para Sprint:** uma regra homologada de inatividade e um destinatário gerencial por projeto.

**Objetivo:** detectar trabalho aberto sem movimentação relevante por um limiar configurado e criar uma ocorrência acionável para o gestor.

**Entregáveis:** definição do que conta como movimentação; fonte da última atividade; limiar configurável em escopo definido; rotina diária; notificação com projeto, tarefa e tempo parado; deduplicação e reabertura após nova inatividade; testes.

**Dependências:** decisão sobre comentários, mudança de status, feed, apontamento de horas e edição de prazo como movimentos válidos; origem do gestor; tratamento de projetos pausados; dados confiáveis de atividade.

**Critérios de aceite:**

1. A data de última movimentação é explicável a partir de eventos definidos, sem usar genericamente um `updated_at` alterado por qualquer edição.
2. Projetos/tarefas concluídos, cancelados ou formalmente pausados não geram alerta.
3. Uma ocorrência não se repete enquanto nada mudar.
4. Após movimentação válida e novo período de inatividade, uma nova ocorrência pode ser criada.

**Fora de escopo:** medir produtividade; SLA de chamados; resumo semanal; monitorar qualquer tabela sem regra funcional homologada.

## GES-02 - Resumo semanal aos gestores

### Sobreposição com o aviso 15 da Sprint 11

`GES-02` coincide integralmente com o aviso 15: resumo de pendências, gestor, e-mail, segunda de manhã. Não há delta funcional comprovado. O repositório possui cálculo de pendências gerenciais em `src/lib/auditPendencias.ts`, mas não foi localizado o envio semanal.

**Tratamento recomendado:** manter um único item `GES-02`, transferindo para ele o aviso 15 somente se ainda não entregue. Se o aviso 15 estiver funcionando e cumprir os critérios abaixo, encerrar `GES-02` como duplicata, sem implementação adicional.

**Recorte executável para Sprint:** um e-mail semanal por gestor, baseado em categorias de pendência já homologadas e links para atuação.

**Objetivo:** consolidar, sem duplicar alertas individuais, as pendências do escopo de responsabilidade de cada gestor.

**Entregáveis:** inventário do aviso 15; regra de escopo por gestor; categorias incluídas; consolidação determinística; template HTML responsivo; agendamento no fuso da PSA; registro de envio e observabilidade; prévia com dados de teste.

**Dependências:** definição de “gestor” e substituição/ausência; confirmação das categorias de `auditPendencias`; remetente e infraestrutura de e-mail; horário de segunda-feira; política para resumo vazio.

**Critérios de aceite:**

1. Cada gestor recebe no máximo um resumo por período.
2. O conteúdo contém somente pendências que pertencem ao seu escopo e não mistura ambientes.
3. Contagens e itens conferem com a fonte homologada para a mesma data de corte.
4. Links levam diretamente ao contexto de tratamento.
5. Falhas ficam registradas e podem ser reprocessadas sem envio duplicado.
6. A política aprovada para resumo vazio é respeitada.

**Fora de escopo:** novo painel de BI; preferências individuais de frequência; anexos analíticos; aviso instantâneo; redefinição ampla das regras de pendência.

## GES-04 - Cobrança automática ao cliente

### Sobreposição com o aviso 8 da Sprint 11

O aviso 8 já especifica cobrança do que falta após X dias sem resposta, por e-mail e em lote. Logo, `GES-04` é a continuidade do mesmo item, não uma cobrança genérica nova. O código atual já possui `solicitacao.enviada_em`, envio externo, histórico e aviso manual consolidado de situação dos documentos. Esse aviso manual não substitui a régua automática.

Há uma decisão de produto a fechar antes da implementação: a Sprint 11 propôs D+3, D+7 e D+14, enquanto o fluxo atual também usa prazo geral de 30 dias para a solicitação. Esses números têm significados diferentes e não devem ser inferidos pelo código.

**Recorte executável para Sprint:** cobrar automaticamente somente pendências do checklist de uma solicitação enviada, por uma régua única homologada.

**Objetivo:** lembrar o cliente do lote pendente nos marcos aprovados, interrompendo a régua quando houver resposta ou encerramento.

**Entregáveis:** decisão da régua; definição de resposta válida; consulta de elegibilidade; rotina agendada; consolidação de pendentes/recusados por solicitação; uso dos canais aprovados e alcançáveis; reserva idempotente por marco, canal e destinatário; histórico e observabilidade; testes de interrupção e retomada.

**Dependências:** decisão funcional sobre D+N e prazo de 30 dias; definição se upload, aprovação, recusa, dispensa ou aviso manual reinicia a régua; templates externos aprovados; dados de contato; situação da solicitação.

**Critérios de aceite:**

1. Uma solicitação gera no máximo uma comunicação consolidada por marco e canal.
2. Nunca é enviada uma mensagem por item.
3. Solicitação não enviada, encerrada ou sem pendência não é cobrada.
4. Atividade definida como resposta interrompe ou recalcula a régua conforme a regra aprovada.
5. Reexecução concorrente do job não duplica o envio.
6. O histórico identifica marco, solicitação, destinatário, canal e resultado.
7. O aviso 8 não permanece simultaneamente como outra implementação da Sprint 11.

**Fora de escopo:** cobrança financeira; solicitações fora do checklist; preferências avançadas; criar um terceiro canal; alterar o conteúdo do aviso manual já existente; cobrança item a item.

## GES-05 - Indicadores gerenciais do sócio

### Diagnóstico

O item atual promete descobrir indicadores, validar fontes, criar mockup e entregar painel. Sem indicadores e fórmulas aprovados, prazo e aceite da implementação são indeterminados. O sistema já possui painéis de performance e boards executivos; a descoberta também deve provar o que será reaproveitado para não criar outro painel com métricas divergentes.

### `GES-05A` - Definir e homologar os indicadores do sócio

**Recorte executável para Sprint:** discovery com prova de dados e protótipo, encerrado por decisão formal de escopo.

**Objetivo:** selecionar um conjunto pequeno de indicadores acionáveis, com responsável de negócio, fórmula, fonte, atualização e permissão definidos.

**Entregáveis:** entrevistas com os sócios; inventário dos indicadores e dashboards existentes; catálogo candidato; matriz valor versus viabilidade; ficha de cada indicador aprovado; consultas de conferência ou amostras reproduzíveis; wireframe; decisão de acesso; backlog priorizado para implementação.

**Dependências:** agenda dos sócios; acesso às fontes de faturamento, horas, projetos, produtos e atrasos; responsáveis capazes de homologar os números.

**Critérios de aceite:**

1. Cada indicador aprovado possui pergunta de negócio, fórmula, dimensão temporal, filtros, fonte e dono.
2. Uma amostra é reconciliada com a fonte e tem resultado aceito pelo responsável.
3. Duplicidades e diferenças em relação aos painéis atuais estão registradas.
4. O wireframe é aprovado com ordem de prioridade.
5. Indicadores sem fonte confiável ficam fora da implementação, e não como números aproximados.

**Fora de escopo:** painel produtivo; obrigação de sete indicadores; contratação de BI; criação de dados inexistentes; métricas preditivas.

### `GES-05B` - Implementar o painel homologado do sócio

**Recorte executável para Sprint:** implementar somente o primeiro conjunto priorizado em `GES-05A`, com limite de indicadores definido antes da estimativa.

**Objetivo:** oferecer uma visão gerencial confiável, restrita e acionável sem duplicar regras de cálculo no componente.

**Entregáveis:** hooks de domínio ou RPCs de agregação; painel e filtros aprovados; estados de carregamento, vazio e erro; navegação para detalhes quando prevista; controle de acesso e rota protegida; testes de cálculo e interface.

**Dependências:** `GES-05A`; fontes disponíveis; decisão de atualização/cache; permissões; eventual **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** identificada na descoberta.

**Critérios de aceite:**

1. Números conferem com as amostras homologadas na mesma data de corte.
2. Filtros não alteram a semântica das fórmulas.
3. Usuário sem autorização não acessa dados nem rota.
4. Indicadores reutilizados mantêm uma única regra de cálculo compartilhada.
5. O painel funciona em desktop e mobile e explicita data de atualização.

**Fora de escopo:** indicadores não priorizados; exploração ad hoc; construtor de dashboards; exportações não aprovadas; alertas automáticos.

## AC-01 - Alterações por mudanças cadastrais

### Diagnóstico

O item atual é habilitador das demais ACs e, ao mesmo tempo, exige dois eventos, comparação temporal, snapshots, linhagem, resoluções, consolidado e documento sem edição manual. A arquitetura existente já possui linhagem e snapshots de `documento_gerado`, mas não possui o domínio completo da sociedade como ledger temporal. O primeiro corte deve usar eventos explícitos e homologados, sem prometer detectar automaticamente qualquer mudança cadastral.

### `AC-01A` - Estruturar o fluxo comum e a revisão de Alteração Contratual

**Recorte executável para Sprint:** criar o contrato funcional/técnico comum de uma AC, sem implementar todos os eventos documentais.

**Objetivo:** representar uma revisão de AC ligada ao instrumento anterior, com estado anterior, mudanças selecionadas, estado posterior e linhagem reproduzível.

**Entregáveis:** casos reais homologados; mapa mínimo do estado societário; definição de snapshot anterior e atual; catálogo inicial de tipos de evento; **⚠️ MIGRAÇÃO** da revisão/eventos se necessária; vínculo com `documento_gerado`; validações de pré-condição; contrato de composição “resoluções + consolidado”; testes da transição antes/depois.

**Dependências:** instrumento anterior confiável e registrado; definição do que é snapshot vigente; modelos jurídicos; decisões manuais do fluxo; arquitetura do motor de documentos.

**Critérios de aceite:**

1. Uma revisão identifica inequivocamente instrumento anterior, estado-base e estado proposto.
2. O estado-base não muda quando o cadastro vivo é editado depois.
3. Mudanças são explícitas e auditáveis, sem inferência jurídica silenciosa.
4. O contrato de dados suporta adicionar os eventos de sede e qualificação sem redesenhar a linhagem.
5. Geração é bloqueada quando falta instrumento anterior ou dado obrigatório.

**Fora de escopo:** ledger societário completo; detectar qualquer alteração do cadastro; gerar AC de capital, quotas, administração ou governança; documento final de todos os eventos.

### `AC-01B` - Gerar AC por mudança de sede

**Recorte executável para Sprint:** um evento de alteração de sede em um tipo societário e modelo homologados.

**Objetivo:** gerar a resolução de mudança de sede e o consolidado coerente a partir da revisão estruturada.

**Entregáveis:** mapeamento do endereço anterior e novo; bloco de resolução; cláusula consolidada; numeração/ratificação; prévia e geração; golden-master de caso real.

**Dependências:** `AC-01A`; endereço completo e validado; modelo homologado; template consolidado compatível.

**Critérios de aceite:**

1. Antes/depois do endereço coincidem com os snapshots da revisão.
2. Resolução, lista de cláusulas alteradas e consolidado são coerentes entre si.
3. O caso real gera documento completo sem correção manual posterior.
4. O documento fica ligado ao anterior e preserva os snapshots usados.

**Fora de escopo:** CPF/qualificação; mudança de capital, sócios, administração ou objeto; múltiplas sedes/filiais não homologadas.

### `AC-01C` - Gerar AC por mudança de CPF ou qualificação

**Recorte executável para Sprint:** um conjunto explicitamente homologado de correções de qualificação de pessoa.

**Objetivo:** gerar a resolução e o consolidado para mudança cadastral juridicamente relevante da pessoa, sem tratar toda edição de cadastro como evento societário.

**Entregáveis:** lista de campos suportados; comparação anterior/atual; bloco de resolução; atualização das ocorrências no consolidado; validações e golden-master.

**Dependências:** `AC-01A`; qualificação versionada da pessoa; decisão jurídica sobre quais campos exigem AC; modelo homologado.

**Critérios de aceite:**

1. Somente campos homologados podem compor esse evento.
2. Valor anterior permanece rastreável mesmo após correção do cadastro atual.
3. Todas as ocorrências pertinentes no consolidado usam a qualificação nova, sem alterar o snapshot antigo.
4. O caso real gera documento completo sem edição manual posterior.

**Fora de escopo:** saneamento cadastral geral; correções que não exigem AC; mudança de sócio; governança; capital e quotas.

## AC-03 - AC de integralização, concentração, imóvel e exigência

### Diagnóstico

`AC-03` agrega eventos societários diferentes. Integralização altera capital e origem do aporte; concentração normalmente envolve cessão/transferência e novo quadro; imóvel adicional pode ser novo aporte ou correção de descrição; exigência cartorial é revisão de um instrumento já produzido. Um único aceite de “uma integralização” não comprova as outras três capacidades.

### `AC-03A` - Homologar os eventos e casos da AC Agro

**Recorte executável para Sprint:** discovery jurídico e de dados dos quatro grupos citados na planilha.

**Objetivo:** separar os eventos, identificar pré/pós-condições e selecionar casos independentes para implementação.

**Entregáveis:** corpus de instrumentos; mapa de eventos e cláusulas; definição de concentração de cotas; classificação de imóvel adicional; fluxo da exigência cartorial; necessidades de capital/quadro/bens/matrículas; golden-master por evento priorizado; ordem de implementação.

**Dependências:** casos reais e acervo de cláusulas; validação jurídica; cadastros e instrumentos anteriores; decisões abertas sobre quadro societário e aportes.

**Critérios de aceite:**

1. Cada caso está decomposto em eventos com estado anterior e posterior.
2. Integralização, concentração, imóvel adicional e exigência não compartilham um nome ambíguo para operações diferentes.
3. Dados existentes e gaps estão mapeados por evento.
4. Há um caso prioritário pequeno o suficiente para a tarefa seguinte.

**Fora de escopo:** schema definitivo; motor genérico; geração de documento; doação; governança.

### `AC-03B` - Gerar AC de integralização homologada

**Recorte executável para Sprint:** uma forma de aporte e um caso Agro homologados, incluindo imóvel adicional somente se ele fizer parte do mesmo evento de aporte.

**Objetivo:** gerar aumento/integralização, quadro posterior e consolidado com origem rastreável dos bens ou quotas aportados.

**Entregáveis:** **⚠️ MIGRAÇÃO** para evento/aporte se necessária; vínculo entre pessoa, capital e origem; resoluções; qualificação dos bens; quadro pós-evento; consolidado; golden-master.

**Dependências:** `AC-01A`; `AC-03A`; dados de `capital_integralizacao`, bens, matrículas e titularidades; decisão de forma de integralização; template homologado.

**Critérios de aceite:**

1. Capital anterior, aumento, capital posterior, quotas e aportes fecham matematicamente.
2. Cada bem/participação tem origem e aportante identificados.
3. Resoluções, quadro posterior e consolidado apresentam os mesmos valores.
4. O caso homologado sai sem edição manual posterior.

**Fora de escopo:** outras formas de aporte; concentração por cessão; exigência cartorial; doação; ledger universal de quotas.

### `AC-03C` - Gerar AC de concentração de cotas

**Recorte executável para Sprint:** um mecanismo jurídico homologado de concentração e um caso real.

**Objetivo:** registrar a movimentação que concentra as cotas e gerar o novo quadro e as cláusulas decorrentes, inclusive condição unipessoal quando aplicável.

**Entregáveis:** evento de transferência; cedentes/cessionário e quantidades; quadro antes/depois; resoluções; efeitos condicionais; consolidado; golden-master.

**Dependências:** `AC-01A`; `AC-03A`; domínio versionado de quadro societário; modelos homologados; regra de valor/contraprestação quando aplicável.

**Critérios de aceite:**

1. A soma de quotas é preservada e o quadro posterior é determinístico.
2. Cedentes, cessionário e origem da transferência permanecem rastreáveis.
3. Cláusulas incompatíveis com condição unipessoal são tratadas conforme modelo homologado.
4. O caso real sai sem edição manual posterior.

**Fora de escopo:** doação de `AC-02`; múltiplos mecanismos de concentração; apuração tributária; integralização.

### `AC-03D` - Tratar exigência cartorial como revisão

**Recorte executável para Sprint:** registrar uma exigência sobre documento gerado e produzir nova revisão vinculada, para um tipo de correção homologado.

**Objetivo:** preservar o instrumento protocolado e rastrear a resposta à exigência sem sobrescrever documento ou snapshot anterior.

**Entregáveis:** **⚠️ MIGRAÇÃO** de protocolo/exigência/revisão se necessária; registro da exigência e prazo; classificação da correção; nova revisão do documento; comparação e linhagem; estado de atendimento.

**Dependências:** `AC-01A`; definição do fluxo cartorial; documento protocolado; responsável e prazos; tipos de exigência prioritários.

**Critérios de aceite:**

1. Documento protocolado permanece imutável e acessível.
2. A nova versão identifica a exigência que a originou e as mudanças efetuadas.
3. Status e prazo do atendimento são rastreáveis.
4. Reexigência cria novo ciclo, sem apagar o anterior.

**Fora de escopo:** integração automática com Junta/cartório; OCR de exigência; correção jurídica automática; protocolos de outros documentos.

## SLD-01 - Biblioteca de Slides

### Diagnóstico

A tarefa atual é descrita como tarefa-pai de `PT-03` e `SUC-02`, mas também inclui integração com os dois geradores. Isso cria dupla contagem: a aceitação de `SLD-01` depende de concluir duas tarefas funcionais que já têm objetivo e aceite próprios. Além disso, uma abstração genérica antes do primeiro template real tende a cristalizar hipóteses não comprovadas.

### `SLD-01A` - Estruturar a fundação mínima de templates PPTX

**Recorte executável para Sprint:** catalogar, carregar, versionar e validar templates, extraindo apenas utilitários comprovadamente comuns aos dois geradores.

**Objetivo:** dar a `PT-03` e `SUC-02` uma forma consistente de selecionar um template homologado, registrar sua versão e validar o PPTX produzido, sem criar editor genérico.

**Entregáveis:** inventário da infraestrutura OOXML existente; contrato de template e versão; catálogo mínimo de templates; armazenamento e resolução do arquivo-base; metadados de geração; utilitários compartilhados necessários aos dois casos; validações estruturais do PPTX; fixtures e testes que abrem o arquivo sem reparos; documentação curta de inclusão de template.

**Dependências:** ao menos um template real homologado; decisões visuais da PSA; requisitos concretos de `PT-03` e `SUC-02`; infraestrutura de `gerar-apresentacao` e `_shared/ooxml`.

**Critérios de aceite:**

1. Um gerador seleciona explicitamente template e versão e registra essa origem no resultado.
2. O pipeline detecta arquivo-base ausente ou incompatível antes de disponibilizar o download.
3. Testes validam integridade do pacote OOXML e abertura sem reparos para as fixtures adotadas.
4. Código comum é extraído por necessidade observada nos dois geradores, não por antecipação de um editor universal.
5. `PT-03` e `SUC-02` continuam responsáveis pelos dados, tabelas, slides e aceite visual de cada apresentação.

**Fora de escopo:** implementar os slides tributários; implementar os slides de ITCMD; editor visual de PowerPoint; biblioteca pública de layouts; textos editoriais automáticos; substituir o motor documental jurídico.

**Divisão recomendada:** `SLD-01` torna-se épico/capacidade e `SLD-01A` é sua única tarefa técnica autônoma neste momento. As integrações permanecem dentro de `PT-03` e `SUC-02`, sem criar `SLD-01B`/`SLD-01C` duplicados.

## Governança - pendência explícita, sem tarefa

Governança não deve ser transformada em tarefa da Sprint 12 neste refinamento. A relação entre Matriz de Alçadas, Acordo de Quotistas, Protocolo de Remuneração e Alteração Contratual continua dependente de conversa com Anne e das decisões listadas em `NOTA_DECISAO_MATRIZ_ALCADAS_AC.md`.

Permanecem pendentes, sem ID de tarefa e sem estimativa:

- decidir se a primeira entrega é handoff, prévia automática ou modelo híbrido;
- decidir se o vínculo com AC ocorre por linha, conceito jurídico ou ambos;
- classificar reflexos societários obrigatórios, opcionais e inexistentes;
- definir aprovação, versionamento e comparação com o contrato vigente;
- delimitar a passagem de responsabilidade entre Governança e AC;
- esclarecer o papel do Acordo de Quotistas e do Protocolo de Remuneração.

Até essa conversa ocorrer, não criar tarefa de geração automática de AC reflexa do conselho nem assumir transformação 1:1 da Matriz em cláusulas contratuais.

## Ordem sugerida

1. Executar `SUC-01A`, `GES-05A`, `AC-01A` e `AC-03A`, pois encerram incertezas que hoje impedem estimativas confiáveis.
2. Conferir formalmente os avisos 8, 9 e 15 na branch de início da Sprint; migrar apenas o saldo real para `GES-01A`, `GES-02` e `GES-04`.
3. Fechar as decisões pequenas de Gestão: janela de prazo, conceito de inatividade, régua de cobrança, escopo do gestor e política de resumo vazio.
4. Executar `GES-01A`, `GES-01B`, `GES-02` e `GES-04` como tarefas independentes, sem um job monolítico que misture destinatários e cadências.
5. Implementar somente um primeiro evento de `AC-01B`/`AC-01C` e um primeiro evento de `AC-03B`/`AC-03C` após homologação, em vez de prometer famílias completas.
6. Executar `SLD-01A` junto do primeiro gerador real, preservando `PT-03` e `SUC-02` como entregas funcionais separadas.
7. Manter Governança pendente até a conversa com Anne, sem ocupar capacidade estimada da Sprint.
