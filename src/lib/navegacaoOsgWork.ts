import {
  Calculator, FileBarChart2, FileSignature, FolderArchive, Network, Rocket, Scale,
  type LucideIcon,
} from 'lucide-react';

/**
 * A navegação do OSG Work, em UM lugar só.
 *
 * POR QUE EXISTE. O menu lateral e o painel de entrada listavam as mesmas telas
 * em dois arquivos, e divergiram: em 14/09/2026 o menu tinha 14 telas em sete
 * grupos e o painel mostrava SETE, soltas, com descrições diferentes das que a
 * própria tela exibe no cabeçalho. Quem clicava lia uma frase no cartão e
 * encontrava outra ao chegar. Duas listas da mesma coisa divergem sempre; a
 * questão é só quando.
 *
 * A ORDEM E OS GRUPOS são os da especificação final da Patrícia (11/09/2026),
 * seção 3: entrada do cliente → estruturação → governança → produção documental
 * → gestão documental → ferramentas → relatórios.
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
 * Hoje o texto está escrito duas vezes: aqui e no `subtitle` de cada página.
 * Fazer as páginas lerem daqui é o passo seguinte — são 16 arquivos, e por ora
 * as duas cópias andam juntas.
 *
 * SÓ O GRUPO TEM ÍCONE, decisão de 14/09/2026. Por um dia os cinco filhos de
 * "Estrutura do Cliente" carregaram o próprio, herdado de quando eram itens
 * soltos na barra, e os outros nove não — inconsistência que ficou anotada aqui
 * esperando decisão. A saída escolhida foi tirar dos cinco: o ícone do grupo já
 * diz de que família a tela é, e um por linha dentro do dropdown competia com
 * ele. O mesmo vale no painel de entrada, onde os cartões perderam o selo.
 *
 * O QUE NÃO ENTRA AQUI: os agrupadores da área OSG Projects (Projetos,
 * Gerencial). São de outra área, com outra lista e outro painel.
 */

export interface TelaOsgWork {
  path: string;
  label: string;
  /** Subtítulo da tela, e texto do cartão. Ver a nota do cabeçalho. */
  descricao: string;
}

export interface GrupoOsgWork {
  id: string;
  rotulo: string;
  icone: LucideIcon;
  telas: readonly TelaOsgWork[];
}

export const GRUPOS_OSG_WORK: readonly GrupoOsgWork[] = [
  {
    id: 'onboarding',
    rotulo: 'Onboarding',
    icone: Rocket,
    telas: [
      {
        path: '/equipe/osg/work/onboarding',
        label: 'Solicitação de documentos',
        // Sem a palavra "iniciais" da especificação: ela era eco do nome que a
        // spec propunha para a tela, "Solicitação Inicial", e o nome não mudou.
        descricao: 'Solicite e acompanhe os documentos de cada cliente.',
      },
      {
        path: '/equipe/osg/work/onboarding/cadastro',
        label: 'Cadastro por Documento',
        // AJUSTADA. A spec dizia "Cadastre uma ENTIDADE". "Entidade" é palavra
        // nossa, de modelo de dados — o usuário vê pessoa, empresa ou imóvel. O
        // §6 da spec pede evitar alternância com linguagem técnica.
        descricao: 'Cadastre pessoas, empresas ou imóveis a partir de um documento ainda não vinculado.',
      },
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
      {
        path: '/equipe/osg/work/qualificacao-das-partes',
        label: 'Qualificação das Partes',
        // AJUSTADA, com o motivo dela: no PDF da Tax ela troca "Cadastro dos
        // clientes" por "Consulte e gerencie" porque "cadastro pode parecer
        // apenas criação de registro". A tela também edita e exclui.
        descricao: 'Cadastre e gerencie pessoas, empresas e vínculos relacionados ao cliente.',
      },
      {
        path: '/equipe/osg/work/quadro-societario',
        label: 'Quadro Societário',
        descricao: 'Visualize e gerencie a participação dos sócios em cada empresa.',
      },
      {
        path: '/equipe/osg/work/diagnostico-patrimonial',
        label: 'Diagnóstico Patrimonial',
        // NÃO AJUSTADA, e é a única pendência de decisão da frente.
        //
        // A spec §5 não manda mudar: manda VALIDAR. "Validar a função real da
        // tela. Se houver análise/diagnóstico, manter o nome. Se a função for
        // apenas cadastral, considerar 'Patrimônio' ou 'Estrutura Patrimonial'."
        // Ou seja: a dúvida é sobre o NOME da tela, e a saída proposta é tirar a
        // palavra "Diagnóstico" — não combiná-la de outro jeito.
        //
        // O que a tela faz, conferido em 14/09/2026: tabela de bens com Ref.,
        // Tipo, Denominação, Valor contábil, Valor de mercado, Status e Ações,
        // mais cadastrar/editar/excluir. Sem gráfico, sem apuração, sem
        // comparação. Pelo critério dela, cai no ramo "apenas cadastral".
        //
        // O RELATÓRIO NÃO ENTRA NO RENOME, e isso reduz o alcance da mudança.
        // Existem duas coisas com este nome: esta tela, que é cadastro, e o
        // "Diagnóstico Patrimonial" da tela de Relatórios, que é o pptx gerado
        // por `DiagnosticoPatrimonialReport`. O relatório é o entregável, e nele
        // a palavra "diagnóstico" é literal — ali ela fica. Duas coisas
        // diferentes com o mesmo nome é justamente parte da confusão.
        //
        // Sobram dois pontos a mudar, se o renome for aprovado: o título/rótulo
        // desta tela e o `page_name` dela no Controle de Acessos (o `page_path`
        // NÃO muda — é chave de `page_permissions`).
        //
        // Não executo porque ela pediu VALIDAR, e a parte que falta não está no
        // código: se "diagnóstico" é o termo que a OSG usa com o cliente, o nome
        // da tela pode acompanhar o do entregável de propósito.
        descricao: 'Mapeie bens, titulares, matrículas e impedimentos do cliente.',
      },
      {
        path: '/equipe/osg/work/controle-matriculas',
        label: 'Controle de Matrículas',
        descricao: 'Consulte e gerencie as matrículas imobiliárias do cliente.',
      },
      {
        path: '/equipe/osg/work/exploracao-rural',
        label: 'Exploração Rural',
        descricao: 'Registre relações de exploração rural entre partes, imóveis e origens da posse.',
      },
    ],
  },
  {
    id: 'governanca',
    rotulo: 'Governança',
    icone: Scale,
    telas: [
      {
        path: '/equipe/osg/work/governanca/orgaos',
        label: 'Órgãos de Governança',
        descricao: 'Cadastre as instâncias responsáveis pelas decisões do cliente.',
      },
      {
        path: '/equipe/osg/work/governanca/matriz',
        label: 'Matriz de Alçadas',
        descricao: 'Defina quais decisões e limites competem a cada órgão de governança.',
      },
    ],
  },
  {
    id: 'oficina',
    rotulo: 'Oficina de Contratos',
    icone: FileSignature,
    telas: [
      {
        path: '/equipe/osg/work/biblioteca-modelos',
        label: 'Biblioteca de Modelos',
        descricao: 'Crie e gerencie blocos reutilizáveis para a montagem de documentos.',
      },
      {
        path: '/equipe/osg/work/montagem-documentos',
        label: 'Montagem de Documentos',
        // Sem a metáfora "como um lego de contrato": a especificação a tira do
        // subtítulo permanente e a libera para ajuda contextual.
        descricao: 'Monte modelos combinando e ordenando os blocos da Biblioteca.',
      },
      {
        path: '/equipe/osg/work/gerar-documento',
        label: 'Gerar Documento',
        // Sem "o documento sai pronto", que a especificação manda remover: o
        // texto tem de preservar a necessidade de revisão.
        descricao: 'Gere documentos preenchidos automaticamente com os dados cadastrados.',
      },
    ],
  },
  {
    id: 'documentos',
    rotulo: 'Documentos',
    icone: FolderArchive,
    telas: [
      {
        path: '/equipe/osg/work/documentos',
        label: 'Documentos do Cliente',
        // AJUSTADA em dois pontos, os dois dela: tirou "TODOS" — no PDF ela
        // reprova "todos os chamados" porque "deixa o universo ambíguo" — e
        // trocou "por entidade" pelos nomes que o usuário reconhece.
        descricao: 'Consulte os arquivos recebidos, organizados por pessoa, empresa ou imóvel.',
      },
      {
        path: '/equipe/osg/work/checklists',
        // SINGULAR: a especificação escreve "Checklists de Documentos", que valia
        // enquanto a tela tinha duas abas. A segunda saiu em 10/09, auditada, e
        // sobrou um checklist. A rota segue no plural — é endereço, não rótulo.
        label: 'Checklist de documentos',
        // AJUSTADA por FATO, não por estilo. A spec escreve "documentos
        // OBRIGATÓRIOS", e a tela não tem essa noção: `checklistDerivado` conta
        // recebido, pendente e não solicitado, e `obrigatorio` não aparece em
        // nenhum ponto do checklist. "Solicitados" é o que a conta faz — e era a
        // palavra dela em 11/09, antes da spec.
        descricao: 'Acompanhe os documentos solicitados, recebidos e pendentes de cada cliente.',
      },
    ],
  },
  {
    id: 'ferramentas',
    rotulo: 'Ferramentas / Cálculos',
    // O ícone do grupo é o da única tela dele: assim nada some da barra
    // recolhida ao trilho, onde só o ícone aparece.
    icone: Calculator,
    telas: [
      {
        path: '/equipe/osg/work/calculadora-itcmd',
        label: 'Calculadora de ITCD',
        descricao: 'Simule o ITCD sobre doações de quotas em diferentes cenários de avaliação.',
      },
    ],
  },
  {
    id: 'relatorios',
    rotulo: 'Relatórios',
    icone: FileBarChart2,
    telas: [
      {
        path: '/equipe/osg/work/relatorios',
        label: 'Relatórios',
        // AJUSTADA: "relatórios consolidados" é vago, e a tela tem quatro
        // relatórios nomeáveis — diagnóstico patrimonial, quadro societário/
        // organograma, abertura de demanda e papéis de trabalho do planejamento
        // tributário. Ela pede nomear o conteúdo quando for possível.
        descricao: 'Gere os relatórios de diagnóstico patrimonial, quadro societário e planejamento tributário do cliente.',
      },
    ],
  },
];

/** A rota do painel de entrada da área, que o item "Início" abre. */
export const INICIO_OSG_WORK = '/equipe/osg/work';
