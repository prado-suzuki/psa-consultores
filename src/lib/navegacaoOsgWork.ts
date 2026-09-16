import {
  Calculator, FileBarChart2, FileSignature, FolderArchive, Network, Rocket, Scale,
  type LucideIcon,
} from 'lucide-react';

/**
 * A navegação do OSG Work, em UM lugar só.
 *
 * POR QUE EXISTE. O menu lateral e o painel de entrada listavam as mesmas telas
 * em dois arquivos, e divergiram: em 14/09/2026 o menu tinha as 16 telas em sete
 * grupos e o painel mostrava SETE, soltas, com descrições diferentes das que a
 * própria tela exibe no cabeçalho. Quem clicava lia uma frase no cartão e
 * encontrava outra ao chegar. Duas listas da mesma coisa divergem sempre; a
 * questão é só quando.
 *
 * TRÊS CONSUMIDORES, UMA FONTE. O menu (`GrupoDaBarra`, via `OsgLayout`), o
 * painel de entrada (`OsgWorkDashboard`) e o cabeçalho de cada uma das 17
 * páginas leem daqui. Até 14/09/2026 a frase ainda estava escrita duas vezes —
 * aqui e no `subtitle` de cada página — e a igualdade dependia de alguém
 * conferir. Agora as páginas referenciam `TELAS_OSG_WORK` pela chave, e o
 * critério de aceite §8 da especificação ("o rótulo de cada item coerente com o
 * H1 da página") deixou de ser algo a verificar: virou estrutura. Chave errada
 * não compila.
 *
 * A ORDEM E OS GRUPOS são os da especificação final da Patrícia (11/09/2026),
 * seção 3: entrada do cliente → estruturação → governança → produção documental
 * → gestão documental → ferramentas → relatórios. A ordem mora em
 * `GRUPOS_OSG_WORK`; o TEXTO mora em `TELAS_OSG_WORK`, e os grupos só apontam
 * para ele. Assim nem dentro deste arquivo a frase aparece duas vezes.
 *
 * AS DESCRIÇÕES são os subtítulos da seção 4 da mesma especificação — a mesma
 * frase que o cabeçalho da tela mostra. Card e tela dizendo o mesmo é o padrão
 * dela: no PDF de ajustes da Tax (14/09) os textos do card e da tela coincidem
 * palavra por palavra em Clientes e em Chamados.
 *
 * CINCO FORAM AJUSTADAS, e cada uma por um motivo que ela própria escreveu
 * naquele PDF ao reprovar um texto da Tax. Estão marcadas uma a uma abaixo. O
 * critério de fechamento dela: "o subtítulo deve complementar o título e
 * responder, de forma concreta, o que o usuário encontra ou faz naquela tela.
 * Evitar termos vagos quando for possível nomear a ação, o conteúdo ou o
 * recorte do dado."
 *
 * QUATRO DIVERGEM DA SPEC DE PROPÓSITO, e as quatro foram validadas com a
 * coordenação — estão marcadas nas entradas. Desvio sem procedência é lido como
 * erro de execução e alguém o desfaz; por isso cada um diz quem decidiu.
 *
 * SÓ O GRUPO TEM ÍCONE, decisão de 14/09/2026. Por um dia os cinco filhos de
 * "Estrutura do Cliente" carregaram o próprio, herdado de quando eram itens
 * soltos na barra, e os outros nove não. A saída escolhida foi tirar dos cinco:
 * o ícone do grupo já diz de que família a tela é, e um por linha dentro do
 * dropdown competia com ele. O mesmo vale no painel de entrada, onde os cartões
 * perderam o selo.
 *
 * O QUE NÃO ENTRA AQUI: os agrupadores da área OSG Projects (Projetos,
 * Gerencial). São de outra área, com outra lista e outro painel.
 */

export interface TelaOsgWork {
  path: string;
  /** Rótulo no menu, título no cartão e H1 da página — os três são este. */
  label: string;
  /** Subtítulo da página e texto do cartão. Ver a nota do cabeçalho. */
  descricao: string;
}

export interface GrupoOsgWork {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  telas: readonly TelaOsgWork[];
}

/**
 * As 17 telas, por chave. É daqui que cada página lê o próprio título e
 * subtítulo — ver o `OsgLayout` de qualquer uma delas.
 *
 * `satisfies` em vez de anotação de tipo: preserva os nomes das chaves, então
 * `TELAS_OSG_WORK.checklistDocumentos` completa sozinho e um nome errado vira
 * erro de compilação, não uma tela sem título.
 */
export const TELAS_OSG_WORK = {
  solicitacaoDocumentos: {
    path: '/equipe/osg/work/onboarding',
    // O NOME DA TELA foi VALIDADO COM A COORDENAÇÃO. A spec §3 propunha
    // "Solicitação Inicial"; ficou "Solicitação de documentos", que já era o
    // termo fechado no glossário do fluxo OSG.
    label: 'Solicitação de documentos',
    // Sem a palavra "iniciais" da especificação: ela era eco do nome que a
    // spec propunha para a tela, e o nome não mudou.
    descricao: 'Solicite e acompanhe os documentos de cada cliente.',
  },

  cadastroPorDocumento: {
    path: '/equipe/osg/work/onboarding/cadastro',
    label: 'Cadastro por Documento',
    // AJUSTADA. A spec dizia "Cadastre uma ENTIDADE". "Entidade" é palavra
    // nossa, de modelo de dados — o usuário vê pessoa, empresa ou imóvel. O
    // §6 da spec pede evitar alternância com linguagem técnica.
    descricao: 'Cadastre pessoas, empresas ou imóveis a partir de um documento ainda não vinculado.',
  },

  qualificacaoDasPartes: {
    path: '/equipe/osg/work/qualificacao-das-partes',
    label: 'Qualificação das Partes',
    // AJUSTADA, com o motivo dela: no PDF da Tax ela troca "Cadastro dos
    // clientes" por "Consulte e gerencie" porque "cadastro pode parecer
    // apenas criação de registro". A tela também edita e exclui.
    descricao: 'Cadastre e gerencie pessoas, empresas e vínculos relacionados ao cliente.',
  },

  quadroSocietario: {
    path: '/equipe/osg/work/quadro-societario',
    label: 'Quadro Societário',
    descricao: 'Visualize e gerencie a participação dos sócios em cada empresa.',
  },

  cadastroPatrimonial: {
    path: '/equipe/osg/work/diagnostico-patrimonial',
    // RENOMEADA em 14/09/2026, por decisão da coordenação.
    //
    // A spec §5 não mandava mudar: mandava VALIDAR. "Validar a função real
    // da tela. Se houver análise/diagnóstico, manter o nome. Se a função for
    // apenas cadastral, considerar 'Patrimônio' ou 'Estrutura Patrimonial'."
    // O que a tela faz, conferido antes de decidir: tabela de bens com Ref.,
    // Tipo, Denominação, Valor contábil, Valor de mercado, Status e Ações,
    // mais cadastrar/editar/excluir. Sem gráfico, sem apuração, sem
    // comparação — o ramo "apenas cadastral" do critério dela.
    //
    // O RELATÓRIO NÃO FOI RENOMEADO. Havia duas coisas com o mesmo nome, e
    // essa colisão era parte da confusão: esta tela, que é cadastro, e o
    // "Diagnóstico Patrimonial" da tela de Relatórios, que é o pptx gerado
    // por `DiagnosticoPatrimonialReport`. O relatório é o entregável, e nele
    // a palavra "diagnóstico" é literal — ali ela fica.
    //
    // O QUE TAMBÉM NÃO MUDOU, e não é esquecimento:
    //   - `path` — é `page_path`, chave de `page_permissions` em produção
    //   - `documento_tipo.modulo`, que tem 29 linhas gravadas com o nome
    //     antigo (conferido em produção em 14/09). O literal de
    //     `checklistPadrao.ts` casa com esse dado; renomear lá quebraria a
    //     junção. Mudar isso é migração de dado, não de rótulo.
    //   - nomes de arquivo, componente, hook e pasta
    label: 'Cadastro Patrimonial',
    // A spec dava "Mapeie bens, titulares…", verbo que combinava com
    // "Diagnóstico". Com o título dizendo CADASTRO, "mapear" traria de volta
    // pela porta dos fundos a ideia de análise que o renome tirou — e o
    // critério dela no PDF da Tax é o oposto: ao ver "Cadastro dos clientes"
    // ela trocou por "Consulte e gerencie", porque "cadastro pode parecer
    // apenas criação de registro". A tela também edita e exclui.
    descricao: 'Cadastre e gerencie bens, titulares, matrículas e impedimentos do cliente.',
  },

  controleMatriculas: {
    path: '/equipe/osg/work/controle-matriculas',
    label: 'Controle de Matrículas',
    descricao: 'Consulte e gerencie as matrículas imobiliárias do cliente.',
  },

  exploracaoRural: {
    path: '/equipe/osg/work/exploracao-rural',
    label: 'Exploração Rural',
    descricao: 'Registre relações de exploração rural entre partes, imóveis e origens da posse.',
  },

  orgaosGovernanca: {
    path: '/equipe/osg/work/governanca/orgaos',
    label: 'Órgãos de Governança',
    descricao: 'Cadastre as instâncias responsáveis pelas decisões do cliente.',
  },

  matrizDeAlcadas: {
    path: '/equipe/osg/work/governanca/matriz',
    label: 'Matriz de Alçadas',
    descricao: 'Defina quais decisões e limites competem a cada órgão de governança.',
  },

  acordoQuotistas: {
    path: '/equipe/osg/work/governanca/acordo',
    label: 'Acordo de Quotistas',
    // A 17ª tela, e a única fora da especificação de 11/09: nasceu na frente
    // GOV-03, depois. A descrição é a frase que a própria tela já exibia antes
    // de haver lista, então card e cabeçalho continuam dizendo o mesmo.
    descricao:
      'O contrato entre os sócios: o que acontece quando alguém quer sair, morre, se separa ou quer vender. O contrato social diz quem é dono e quem manda; o acordo diz o resto.',
  },

  bibliotecaModelos: {
    path: '/equipe/osg/work/biblioteca-modelos',
    label: 'Biblioteca de Modelos',
    descricao: 'Crie e gerencie blocos reutilizáveis para a montagem de documentos.',
  },

  montagemDocumentos: {
    path: '/equipe/osg/work/montagem-documentos',
    label: 'Montagem de Documentos',
    // Sem a metáfora "como um lego de contrato": a especificação a tira do
    // subtítulo permanente e a libera para ajuda contextual.
    descricao: 'Monte modelos combinando e ordenando os blocos da Biblioteca.',
  },

  gerarDocumento: {
    path: '/equipe/osg/work/gerar-documento',
    label: 'Gerar Documento',
    // Sem "o documento sai pronto", que a especificação manda remover: o
    // texto tem de preservar a necessidade de revisão.
    descricao: 'Gere documentos preenchidos automaticamente com os dados cadastrados.',
  },

  documentosCliente: {
    path: '/equipe/osg/work/documentos',
    label: 'Documentos do Cliente',
    // AJUSTADA em dois pontos, os dois dela: tirou "TODOS" — no PDF ela
    // reprova "todos os chamados" porque "deixa o universo ambíguo" — e
    // trocou "por entidade" pelos nomes que o usuário reconhece.
    descricao: 'Consulte os arquivos recebidos, organizados por pessoa, empresa ou imóvel.',
  },

  checklistDocumentos: {
    path: '/equipe/osg/work/checklists',
    // SINGULAR, VALIDADO COM A COORDENAÇÃO: a especificação escreve
    // "Checklists de Documentos", que valia enquanto a tela tinha duas abas. A
    // segunda saiu em 10/09, auditada, e sobrou um checklist. A rota segue no
    // plural — é endereço, não rótulo.
    label: 'Checklist de documentos',
    // AJUSTADA por FATO, não por estilo, e VALIDADA COM A COORDENAÇÃO. A spec
    // escreve "documentos OBRIGATÓRIOS", e a tela não tem essa noção:
    // `checklistDerivado` conta recebido, pendente e não solicitado, e
    // `obrigatorio` não aparece em nenhum ponto do checklist. "Solicitados" é
    // o que a conta faz — e era a palavra dela em 11/09, antes da spec.
    descricao: 'Acompanhe os documentos solicitados, recebidos e pendentes de cada cliente.',
  },

  calculadoraItcd: {
    path: '/equipe/osg/work/calculadora-itcmd',
    label: 'Calculadora de ITCD',
    descricao: 'Simule o ITCD sobre doações de quotas em diferentes cenários de avaliação.',
  },

  relatorios: {
    path: '/equipe/osg/work/relatorios',
    label: 'Relatórios',
    // AJUSTADA: "relatórios consolidados" é vago, e a tela tem quatro
    // relatórios nomeáveis — diagnóstico patrimonial, quadro societário/
    // organograma, abertura de demanda e papéis de trabalho do planejamento
    // tributário. Ela pede nomear o conteúdo quando for possível.
    descricao: 'Gere os relatórios de diagnóstico patrimonial, quadro societário e planejamento tributário do cliente.',
  },
} satisfies Record<string, TelaOsgWork>;

/**
 * A ordem e os agrupamentos do menu e do painel. Só aponta para
 * `TELAS_OSG_WORK` — reordenar aqui não toca em texto nenhum.
 */
export const GRUPOS_OSG_WORK: readonly GrupoOsgWork[] = [
  {
    id: 'onboarding',
    rotulo: 'Onboarding',
    icone: Rocket,
    telas: [
      TELAS_OSG_WORK.solicitacaoDocumentos,
      TELAS_OSG_WORK.cadastroPorDocumento,
    ],
  },
  {
    id: 'estrutura',
    rotulo: 'Estrutura do Cliente',
    // `Network` — nós ligados. O grupo reúne pessoas, empresas, quotas, bens e
    // matrículas, e o que os junta são os vínculos. NÃO reusa `Building2`, que
    // já marca CLIENTE na barra de seleção logo acima.
    icone: Network,
    telas: [
      TELAS_OSG_WORK.qualificacaoDasPartes,
      TELAS_OSG_WORK.quadroSocietario,
      TELAS_OSG_WORK.cadastroPatrimonial,
      TELAS_OSG_WORK.controleMatriculas,
      TELAS_OSG_WORK.exploracaoRural,
    ],
  },
  {
    id: 'governanca',
    rotulo: 'Governança',
    icone: Scale,
    telas: [
      TELAS_OSG_WORK.orgaosGovernanca,
      TELAS_OSG_WORK.matrizDeAlcadas,
      // O acordo vem DEPOIS da matriz, e isso foi verificado no documento: o
      // próprio acordo manda que composição, eleição e prazos de gestão
      // obedeçam ao contrato social, e define o quórum PARA ALTERAR o
      // contrato. Como a matriz é o que vira as cláusulas de competência dele,
      // ela vem antes.
      TELAS_OSG_WORK.acordoQuotistas,
    ],
  },
  {
    id: 'oficina',
    rotulo: 'Oficina de Contratos',
    icone: FileSignature,
    telas: [
      TELAS_OSG_WORK.bibliotecaModelos,
      TELAS_OSG_WORK.montagemDocumentos,
      TELAS_OSG_WORK.gerarDocumento,
    ],
  },
  {
    id: 'documentos',
    rotulo: 'Documentos',
    icone: FolderArchive,
    telas: [
      TELAS_OSG_WORK.documentosCliente,
      TELAS_OSG_WORK.checklistDocumentos,
    ],
  },
  {
    id: 'ferramentas',
    rotulo: 'Ferramentas / Cálculos',
    // O ícone do grupo é o da única tela dele: assim nada some da barra
    // recolhida ao trilho, onde só o ícone aparece.
    icone: Calculator,
    telas: [
      TELAS_OSG_WORK.calculadoraItcd,
    ],
  },
  {
    id: 'relatorios',
    rotulo: 'Relatórios',
    icone: FileBarChart2,
    telas: [
      TELAS_OSG_WORK.relatorios,
    ],
  },
];

/** A rota do painel de entrada da área, que o item "Início" abre. */
export const INICIO_OSG_WORK = '/equipe/osg/work';
