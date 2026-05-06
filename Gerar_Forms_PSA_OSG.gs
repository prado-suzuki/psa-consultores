/**
 * ============================================================================
 *  PSA OSG · Gerador Automático dos 3 Formulários de Diagnóstico
 *  ----------------------------------------------------------------------------
 *  Roda UMA VEZ e cria:
 *    • Forms 01 — Sócios (Fernando e Cuba) · 15 perguntas
 *    • Forms 02 — Seniores (6 consultores) · 25 perguntas
 *    • Forms 03 — Assistentes A/B/C · 28 perguntas
 *    • Planilha consolidada com as respostas dos 3 forms (abas separadas)
 *
 *  COMO USAR
 *  1. Acesse https://script.google.com  → Novo projeto
 *  2. Apague o código que aparece e cole TODO este arquivo
 *  3. Salve (Ctrl+S) e dê um nome ao projeto (ex: "PSA OSG Forms")
 *  4. No menu superior, selecione a função  gerarTodosOsForms  e clique ▶ "Executar"
 *  5. Autorize o script a acessar Forms e Drive (primeira execução)
 *  6. No log (Ctrl+Enter) aparecem os links dos 3 formulários e da planilha
 *
 *  Autora: Patrícia Melo · Coordenação Transformação Digital · PSA
 * ============================================================================
 */

// ---------- CONFIGURAÇÃO --------------------------------------------------
const PASTA_DESTINO_ID = ''; // Opcional: ID de pasta no Drive. Vazio = raiz do Drive
const PREFIXO_TITULO  = 'PSA OSG · ';
// --------------------------------------------------------------------------


/**
 * Função principal — roda tudo de uma vez.
 */
function gerarTodosOsForms() {
  // 1. Cria a planilha consolidada de respostas
  const planilha = SpreadsheetApp.create(PREFIXO_TITULO + 'Respostas Diagnóstico OSG');
  Logger.log('📊 Planilha de respostas criada: ' + planilha.getUrl());

  // 2. Gera os três forms e vincula à planilha
  const formSocios      = criarFormSocios(planilha.getId());
  const formSeniores    = criarFormSeniores(planilha.getId());
  const formAssistentes = criarFormAssistentes(planilha.getId());

  // 3. Move tudo para a pasta de destino (se configurada)
  if (PASTA_DESTINO_ID) {
    const pasta = DriveApp.getFolderById(PASTA_DESTINO_ID);
    pasta.addFile(DriveApp.getFileById(planilha.getId()));
    pasta.addFile(DriveApp.getFileById(formSocios.getId()));
    pasta.addFile(DriveApp.getFileById(formSeniores.getId()));
    pasta.addFile(DriveApp.getFileById(formAssistentes.getId()));
  }

  // 4. Log com todos os links
  Logger.log('\n========================================');
  Logger.log('✅ TUDO PRONTO. Links abaixo:');
  Logger.log('----------------------------------------');
  Logger.log('🟡 SÓCIOS (Fernando, Cuba):');
  Logger.log('   Editar : ' + formSocios.getEditUrl());
  Logger.log('   Enviar : ' + formSocios.getPublishedUrl());
  Logger.log('🔵 SENIORES (6 consultores):');
  Logger.log('   Editar : ' + formSeniores.getEditUrl());
  Logger.log('   Enviar : ' + formSeniores.getPublishedUrl());
  Logger.log('🟢 ASSISTENTES (A, B, C):');
  Logger.log('   Editar : ' + formAssistentes.getEditUrl());
  Logger.log('   Enviar : ' + formAssistentes.getPublishedUrl());
  Logger.log('📊 PLANILHA DE RESPOSTAS:');
  Logger.log('   ' + planilha.getUrl());
  Logger.log('========================================');
}


// ============================================================================
//  FORMS 01 · SÓCIOS
// ============================================================================
function criarFormSocios(planilhaId) {
  const form = FormApp.create(PREFIXO_TITULO + 'Diagnóstico Estratégico OSG — Sócios');
  form.setDescription(
    'Fernando e Cuba — esse formulário faz parte do diagnóstico inicial da OSG dentro do projeto de Transformação Digital da PSA. ' +
    'São 15 perguntas que levam cerca de 25 minutos. ' +
    'Não existe resposta certa ou errada — quanto mais direto vocês forem, melhor o diagnóstico fica.\n\nPrazo: 10 dias.'
  );
  form.setCollectEmail(true);
  form.setProgressBar(true);

  // Seção 1
  form.addPageBreakItem().setTitle('Identificação');
  form.addTextItem().setTitle('Nome completo').setRequired(true);
  form.addMultipleChoiceItem()
      .setTitle('Tempo de atuação na PSA')
      .setChoiceValues(['Menos de 5 anos','5 a 10 anos','10 a 15 anos','Mais de 15 anos']);

  // Seção 2 — Visão da Área
  form.addPageBreakItem().setTitle('Visão da Área');
  form.addParagraphTextItem().setTitle('Em 2-3 linhas, descreva qual é o papel da OSG dentro da holding PSA hoje.');
  form.addParagraphTextItem().setTitle('Quais são os 3 principais tipos de projeto que a OSG entrega atualmente?');
  form.addParagraphTextItem().setTitle('Como você descreveria o diferencial da OSG em relação a outros escritórios que fazem reestruturação societária?');
  form.addParagraphTextItem().setTitle('Olhando para os próximos 12 meses, qual é sua principal prioridade estratégica para a área?');

  // Seção 3 — Percepção de Eficiência
  form.addPageBreakItem().setTitle('Percepção de Eficiência');
  form.addMultipleChoiceItem()
      .setTitle('Como você avalia a capacidade atual da equipe de absorver novas demandas?')
      .setChoiceValues(['Sobrando capacidade','Equilibrado','No limite','Saturada, perdendo oportunidades']);
  form.addCheckboxItem()
      .setTitle('O que hoje atrasa a entrega de um projeto novo?')
      .setHelpText('Pode marcar mais de uma opção.')
      .setChoiceValues([
        'Coleta de documentos com o cliente',
        'Tempo de elaboração de Diagnóstico Patrimonial',
        'Tempo de elaboração de minutas societárias',
        'Revisão pelo senior ou sócio',
        'Interface com equipe do Fiscal/Consultoria',
        'Interface com equipe dos Advogados (externo)',
        'Exigências de órgãos (juntas comerciais, cartórios)',
        'Disponibilidade da equipe',
        'Outros'
      ]);
  form.addParagraphTextItem().setTitle('Se você pudesse eliminar uma coisa do dia a dia da OSG, o que seria?');

  // Seção 4 — Visibilidade e Gestão
  form.addPageBreakItem().setTitle('Visibilidade e Gestão');
  form.addParagraphTextItem().setTitle('Hoje, como você acompanha o andamento dos projetos em execução?');
  form.addScaleItem()
      .setTitle('Você sente que tem visibilidade em tempo real do status de cada projeto?')
      .setBounds(1, 5)
      .setLabels('Nenhuma visibilidade', 'Visibilidade total');
  form.addParagraphTextItem().setTitle('Qual informação você gostaria de ter em tempo real sobre a OSG, mas hoje não tem?');

  // Seção 5 — Interface com Outras Áreas
  form.addPageBreakItem().setTitle('Interface com Outras Áreas');
  form.addScaleItem()
      .setTitle('Como você avalia a comunicação da OSG com as outras áreas da holding (Fiscal, Consultoria, Fixos, equipe do Fernando/advogados)?')
      .setBounds(1, 5)
      .setLabels('Péssima', 'Excelente');
  form.addParagraphTextItem().setTitle('Onde estão os principais pontos de atrito na comunicação entre OSG e outras áreas?');

  // Seção 6 — Expectativas do Projeto
  form.addPageBreakItem().setTitle('Expectativas do Projeto');
  form.addParagraphTextItem().setTitle('Se este projeto de transformação digital for um sucesso em 3 meses, o que deve ter mudado na OSG?');

  // Vincular respostas à planilha
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilhaId);
  renomearAbaDeRespostas_(planilhaId, form, 'Respostas Sócios');

  return form;
}


// ============================================================================
//  FORMS 02 · SENIORES
// ============================================================================
function criarFormSeniores(planilhaId) {
  const form = FormApp.create(PREFIXO_TITULO + 'Diagnóstico Operacional OSG — Seniores');
  form.setDescription(
    'Olá pessoal, esse formulário faz parte do diagnóstico da OSG dentro do projeto de Transformação Digital da PSA. ' +
    'Vocês são quem mais conhece a operação do dia a dia. São 25 perguntas (cerca de 35-40 minutos). ' +
    'NÃO é avaliação de desempenho. Quanto mais específico vocês forem, mais útil o diagnóstico fica.\n\nPrazo: 7 dias.'
  );
  form.setCollectEmail(true);
  form.setProgressBar(true);

  // Seção 1 — Identificação
  form.addPageBreakItem().setTitle('Identificação');
  form.addTextItem().setTitle('Nome completo').setRequired(true);
  form.addMultipleChoiceItem()
      .setTitle('Tempo de atuação na PSA')
      .setChoiceValues(['Menos de 2 anos','2 a 5 anos','5 a 10 anos','Mais de 10 anos']);
  form.addMultipleChoiceItem()
      .setTitle('Quantos projetos você lidera ou acompanha em média por mês?')
      .setChoiceValues(['1 a 3','4 a 6','7 a 10','Mais de 10']);

  // Seção 2 — Distribuição de Tempo
  form.addPageBreakItem().setTitle('Distribuição de Tempo');
  form.addGridItem()
      .setTitle('Numa semana típica, qual o percentual do seu tempo em cada atividade? (deve somar 100%)')
      .setRows([
        'Análise técnica e posicionamento jurídico',
        'Elaboração/revisão de minutas e documentos',
        'Reuniões com cliente',
        'Reuniões internas e alinhamentos',
        'Supervisão de assistentes',
        'Coleta e organização de documentos',
        'Pesquisa e estudo técnico',
        'Apagar incêndios e urgências'
      ])
      .setColumns(['0-10%','10-20%','20-30%','30-40%','40%+']);
  form.addParagraphTextItem().setTitle('Qual atividade do item anterior mais consome seu tempo e você sente que tem menor valor agregado?');

  // Seção 3 — Processos Recorrentes
  form.addPageBreakItem().setTitle('Processos Recorrentes');
  form.addCheckboxItem()
      .setTitle('Dos blocos abaixo, quais você executa ou supervisiona com mais frequência?')
      .setHelpText('Pode marcar mais de um.')
      .setChoiceValues([
        'Diagnóstico Patrimonial (DP)',
        'WP Sócios e organograma familiar',
        'Contrato Social / Estatuto Social (constituição)',
        'Alterações contratuais e atas de assembleia',
        'Reorganização societária (cisão, fusão, incorporação)',
        'Instrumentos agrários (parceria, comodato, arrendamento)',
        'Termo de encerramento de safra',
        'Cálculo de ITCD',
        'Instrumentos sucessórios (doações, testamentos)',
        'Diagnóstico Tributário de estruturas',
        'Apresentações (pptx) de projeto'
      ]);
  form.addParagraphTextItem().setTitle('Entre esses blocos, qual é o mais demorado em relação ao valor que entrega?');
  form.addParagraphTextItem().setTitle('Existe algum desses blocos que você acha que a tecnologia poderia automatizar parcial ou totalmente? Qual e por quê?');

  // Seção 4 — Diagnóstico Patrimonial
  form.addPageBreakItem().setTitle('Diagnóstico Patrimonial');
  form.addMultipleChoiceItem()
      .setTitle('Em média, quanto tempo leva para elaborar o DP de um projeto novo, do recebimento dos documentos até o DP pronto para apresentação?')
      .setChoiceValues(['Menos de 1 semana','1 a 2 semanas','2 a 4 semanas','Mais de 4 semanas','Varia muito']);
  form.addParagraphTextItem().setTitle('Qual a parte mais trabalhosa do DP hoje?');
  form.addParagraphTextItem().setTitle('Você usa algum modelo ou template padrão para o DP, ou cada um faz do seu jeito?');

  // Seção 5 — Minutas e Documentos Societários
  form.addPageBreakItem().setTitle('Minutas e Documentos Societários');
  form.addMultipleChoiceItem()
      .setTitle('Quando você vai elaborar um Contrato Social ou Alteração Contratual, de onde você tira o modelo base?')
      .setChoiceValues([
        'De um projeto anterior meu',
        'De pasta compartilhada com modelos padrão',
        'Monto do zero com base na legislação',
        'Peço para o assistente buscar',
        'Varia muito'
      ]);
  form.addScaleItem()
      .setTitle('Você sente que as minutas da OSG hoje têm um padrão consolidado, ou cada senior tem seu jeito?')
      .setBounds(1, 5)
      .setLabels('Cada um faz do seu jeito', 'Totalmente padronizado');
  form.addMultipleChoiceItem()
      .setTitle('Quanto tempo, em média, você gasta revisando uma Ata de Assembleia ou Alteração Contratual elaborada pelo assistente?')
      .setChoiceValues(['Menos de 30 minutos','30 minutos a 1 hora','1 a 2 horas','Mais de 2 horas']);
  form.addParagraphTextItem().setTitle('O que mais volta da sua revisão para o assistente corrigir?');

  // Seção 6 — Documentos, Sistemas e Organização
  form.addPageBreakItem().setTitle('Documentos, Sistemas e Organização');
  form.addCheckboxItem()
      .setTitle('Onde você encontra os documentos de um projeto hoje?')
      .setHelpText('Pode marcar mais de um.')
      .setChoiceValues(['Google Drive da OSG','SharePoint','E-mail','WhatsApp','Docbox','Drive pessoal / local','Outros']);
  form.addMultipleChoiceItem()
      .setTitle('Quanto tempo, em média, você gasta por semana procurando documento de cliente ou projeto?')
      .setChoiceValues(['Menos de 30 minutos','30 minutos a 1 hora','1 a 2 horas','2 a 4 horas','Mais de 4 horas']);
  form.addCheckboxItem()
      .setTitle('Quais sistemas ou ferramentas você usa no dia a dia?')
      .setHelpText('Marque todas que se aplicam.')
      .setChoiceValues([
        'Google Workspace (Drive, Docs, Sheets)',
        'SharePoint',
        'Docbox',
        'Excel',
        'Word',
        'PowerPoint',
        'Sistemas de Junta Comercial',
        'E-CAC / ReceitaBX',
        'Cartórios online',
        'Outros'
      ]);

  // Seção 7 — Interface com Outras Áreas
  form.addPageBreakItem().setTitle('Interface com Outras Áreas');
  form.addScaleItem()
      .setTitle('Em projetos que envolvem o Fiscal (Felipe, Ricardo) ou Consultoria, como está a comunicação?')
      .setBounds(1, 5)
      .setLabels('Péssima', 'Excelente');
  form.addMultipleChoiceItem()
      .setTitle('Já aconteceu de você receber demanda de última hora de outra área (ex: "amanhã tem apresentação")? Com que frequência?')
      .setChoiceValues([
        'Nunca',
        'Raramente (1x mês)',
        'Às vezes (2-3x mês)',
        'Frequentemente (semanal)',
        'Muito frequente (várias vezes por semana)'
      ]);
  form.addParagraphTextItem().setTitle('Onde está o maior atrito na interface entre OSG e outras áreas?');

  // Seção 8 — Gestão de Prazos e Projetos
  form.addPageBreakItem().setTitle('Gestão de Prazos e Projetos');
  form.addParagraphTextItem().setTitle('Como você acompanha hoje os prazos dos seus projetos?');
  form.addParagraphTextItem().setTitle('Já aconteceu de perder ou quase perder prazo por falta de visibilidade? Se sim, descreva brevemente a situação.');

  // Seção 9 — Oportunidades
  form.addPageBreakItem().setTitle('Oportunidades');
  form.addParagraphTextItem().setTitle('Se você pudesse automatizar UMA coisa hoje, qual seria?');
  form.addParagraphTextItem().setTitle('O que você acha que os sócios não veem sobre o dia a dia da operação?');

  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilhaId);
  renomearAbaDeRespostas_(planilhaId, form, 'Respostas Seniores');

  return form;
}


// ============================================================================
//  FORMS 03 · ASSISTENTES (A, B, C)
// ============================================================================
function criarFormAssistentes(planilhaId) {
  const form = FormApp.create(PREFIXO_TITULO + 'Diagnóstico Operacional OSG — Assistentes');
  form.setDescription(
    'Oi pessoal, esse formulário faz parte do diagnóstico da OSG dentro do projeto de Transformação Digital da PSA. ' +
    'Vocês são quem executa a maior parte da rotina operacional, então quem mais pode me ajudar a entender onde o tempo realmente é gasto. ' +
    'São 28 perguntas (cerca de 40 minutos). ISSO NÃO É AVALIAÇÃO DE DESEMPENHO — é mapeamento de processo. ' +
    'Quanto mais honesto o retrato, melhor vou conseguir construir ferramentas que ajudem vocês.\n\nPrazo: 7 dias.'
  );
  form.setCollectEmail(true);
  form.setProgressBar(true);

  // Seção 1 — Identificação
  form.addPageBreakItem().setTitle('Identificação');
  form.addTextItem().setTitle('Nome completo').setRequired(true);
  form.addMultipleChoiceItem()
      .setTitle('Nível do cargo')
      .setChoiceValues(['Assistente A','Assistente B','Assistente C']);
  form.addMultipleChoiceItem()
      .setTitle('Tempo de atuação na PSA')
      .setChoiceValues(['Menos de 6 meses','6 meses a 1 ano','1 a 2 anos','2 a 5 anos','Mais de 5 anos']);

  // Seção 2 — Rotina Real
  form.addPageBreakItem().setTitle('Rotina Real');
  form.addGridItem()
      .setTitle('Numa semana típica, qual o percentual do seu tempo em cada atividade? (deve somar 100%)')
      .setRows([
        'Solicitação e organização de documentos (Docbox, e-mail)',
        'Análise de matrículas, ITR, CCIR, escrituras',
        'Compilação de Diagnóstico Patrimonial',
        'Elaboração de WP Sócios',
        'Elaboração de minutas (Contrato Social, Alterações, Atas)',
        'Elaboração de instrumentos agrários',
        'Elaboração de pptx de apresentação',
        'Cálculos (ITCD, diagnóstico tributário)',
        'Revisão de documentos',
        'Exigências de juntas e cartórios',
        'Reuniões e alinhamentos',
        'Outros'
      ])
      .setColumns(['0-10%','10-20%','20-30%','30-40%','40%+']);
  form.addParagraphTextItem().setTitle('Qual dessas atividades consome mais tempo do seu dia?');
  form.addParagraphTextItem().setTitle('Qual atividade você acha mais repetitiva e mecânica?');

  // Seção 3 — Documentos e Coleta
  form.addPageBreakItem().setTitle('Documentos e Coleta');
  form.addCheckboxItem()
      .setTitle('De onde vêm os documentos dos clientes que você recebe?')
      .setHelpText('Marque todas que se aplicam.')
      .setChoiceValues(['Docbox','E-mail','WhatsApp','Google Drive','SharePoint','Entregue em reunião','Outros']);
  form.addMultipleChoiceItem()
      .setTitle('Quanto tempo, em média, você gasta por semana organizando documentos recebidos?')
      .setChoiceValues(['Menos de 1 hora','1 a 3 horas','3 a 5 horas','5 a 10 horas','Mais de 10 horas']);
  form.addParagraphTextItem().setTitle('Quando um documento chega, onde você salva?');
  form.addMultipleChoiceItem()
      .setTitle('Já aconteceu de você precisar de um documento que o cliente enviou e não conseguir localizar rápido?')
      .setChoiceValues(['Nunca','Raramente','Às vezes','Frequentemente','Sempre']);

  // Seção 4 — Diagnóstico Patrimonial
  form.addPageBreakItem().setTitle('Diagnóstico Patrimonial (DP)');
  form.addMultipleChoiceItem()
      .setTitle('Você elabora ou auxilia na elaboração do DP?')
      .setChoiceValues(['Elaboro de ponta a ponta','Elaboro com supervisão','Auxilio na coleta e compilação','Não participo']);
  form.addMultipleChoiceItem()
      .setTitle('Se você participa do DP, quanto tempo em média leva para montar um?')
      .setChoiceValues(['Menos de 4 horas','4 a 8 horas','1 a 2 dias úteis','3 a 5 dias úteis','Mais de 5 dias úteis','Varia muito','Não participo']);
  form.addParagraphTextItem().setTitle('Qual a parte mais chata ou demorada do DP?');
  form.addParagraphTextItem().setTitle('Você usa algum modelo padrão ou cada cliente é montado do zero?');

  // Seção 5 — Minutas Societárias
  form.addPageBreakItem().setTitle('Minutas Societárias');
  form.addMultipleChoiceItem()
      .setTitle('Quando você elabora um Contrato Social, Alteração Contratual ou Ata, de onde tira o modelo?')
      .setChoiceValues(['De um projeto anterior','De pasta com modelos','O senior manda o modelo','Monto do zero com base em pesquisa','Varia']);
  form.addMultipleChoiceItem()
      .setTitle('Quantas vezes, em média, uma minuta volta para correção após revisão do senior?')
      .setChoiceValues(['Raramente volta','1 vez','2 vezes','3 vezes ou mais','Varia muito']);
  form.addParagraphTextItem().setTitle('Quais são os erros ou correções mais comuns que voltam?');

  // Seção 6 — WP Sócios e Organograma
  form.addPageBreakItem().setTitle('WP Sócios e Organograma');
  form.addParagraphTextItem().setTitle('Como é o processo de montar o WP Sócios hoje? (estado civil, regime de bens, organograma familiar)');
  form.addMultipleChoiceItem()
      .setTitle('Quanto tempo leva para montar um WP Sócios completo?')
      .setChoiceValues(['Menos de 2 horas','2 a 4 horas','Meio dia útil','1 dia útil','Mais de 1 dia']);

  // Seção 7 — Instrumentos Agrários
  form.addPageBreakItem().setTitle('Instrumentos Agrários e Documentos Específicos');
  form.addMultipleChoiceItem()
      .setTitle('Você elabora instrumentos agrários (parceria, comodato, arrendamento, encerramento de safra)?')
      .setChoiceValues(['Sim, com frequência','Sim, eventualmente','Raramente','Não']);
  form.addParagraphTextItem().setTitle('Se elabora, quais travam mais o seu tempo?');

  // Seção 8 — Ferramentas e Sistemas
  form.addPageBreakItem().setTitle('Ferramentas e Sistemas');
  form.addCheckboxItem()
      .setTitle('Quais ferramentas você usa diariamente?')
      .setHelpText('Marque todas que se aplicam.')
      .setChoiceValues([
        'Word','Excel','PowerPoint',
        'Google Docs / Sheets / Slides',
        'Docbox','SharePoint',
        'Sistemas de Juntas Comerciais',
        'E-CAC','Cartório online','Outros'
      ]);
  form.addParagraphTextItem().setTitle('Qual dessas ferramentas você acha que mais atrapalha ou trava?');
  form.addScaleItem()
      .setTitle('Você sente que tem os meios e sistemas certos para fazer seu trabalho?')
      .setBounds(1, 5)
      .setLabels('Totalmente insuficiente', 'Tenho tudo que preciso');

  // Seção 9 — Gestão de Prazos
  form.addPageBreakItem().setTitle('Gestão de Prazos');
  form.addParagraphTextItem().setTitle('Como você acompanha os prazos das suas entregas hoje?');
  form.addMultipleChoiceItem()
      .setTitle('Já teve semana em que você sentiu que ia perder prazo por excesso de demanda?')
      .setChoiceValues(['Nunca','Raramente','Às vezes','Frequentemente','Quase toda semana']);

  // Seção 10 — O Que Mudaria
  form.addPageBreakItem().setTitle('O Que Mudaria');
  form.addParagraphTextItem().setTitle('Se você pudesse eliminar UMA tarefa repetitiva do seu dia, qual seria?');
  form.addParagraphTextItem().setTitle('Se você pudesse ter UMA ferramenta ou automação nova, o que ela faria?');

  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilhaId);
  renomearAbaDeRespostas_(planilhaId, form, 'Respostas Assistentes');

  return form;
}


// ============================================================================
//  HELPER · renomeia a aba criada pelo Forms para um nome legível
// ============================================================================
function renomearAbaDeRespostas_(planilhaId, form, novoNome) {
  // Pequeno delay para o Forms criar a aba antes de renomearmos
  Utilities.sleep(2000);
  const ss = SpreadsheetApp.openById(planilhaId);
  const abas = ss.getSheets();
  // A aba mais recente é a que acabou de ser criada
  const abaNova = abas[abas.length - 1];
  // Garante que o nome não vai colidir
  let nome = novoNome;
  let i = 2;
  while (ss.getSheetByName(nome)) { nome = novoNome + ' ' + i; i++; }
  abaNova.setName(nome);
}
