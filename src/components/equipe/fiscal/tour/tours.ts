// Tours guiados da Tax: o manual de cadastro dentro da própria ferramenta.
//
// O texto vem dos dois manuais escritos em 08/09/2026 (cadastro de cliente e
// projetos a partir da OS), encurtado para caber num tooltip. Onde o manual
// explica o motivo em um parágrafo, aqui fica a frase que muda a ação.
//
// Três tours abrem por ROTA (clientes, tarefas, lote) e três abrem junto com o
// que eles explicam (o modal de cadastro, a aba de OS, o diálogo de criação),
// porque as âncoras deles só existem com aquilo aberto. Quem dispara os de
// modal é o próprio componente, via `startTour`.
//
// Os `target` apontam para `[data-tour="…"]`, estáveis e independentes de
// classe de estilo. Passo cuja âncora não está na tela é descartado pelo
// provider: é o que faz o mesmo tour servir para líder e para sublíder, que não
// enxerga a aba de OS.

import type { Step } from 'react-joyride';
import type { RegistroDeTour } from '@/components/tour/TourProvider';

export type TaxTourId =
  | 'clientes'
  | 'tarefas'
  | 'lote'
  // Abrem com o que explicam:
  | 'modal-cliente'
  | 'modal-os'
  | 'criar-projeto';

export const TAX_PROJETOS = '/equipe/tax/projetos';

/** Passo final das telas: indica o "?" do header. */
const replay: Step = {
  target: '[data-tour="help"]',
  placement: 'bottom',
  title: 'Pronto',
  content: 'Para rever este guia quando quiser, clique no “?” aqui no topo. Cada tela tem o seu.',
};

/** Passo final dos modais: indica o "?" do próprio modal. */
const replayModal: Step = {
  target: '[data-tour="modal-help"]',
  placement: 'bottom',
  title: 'Pronto',
  content: 'Para rever este guia, clique no “?” deste modal.',
};

// ─── Tela de Clientes ────────────────────────────────────────────────────────
const clientes: Step[] = [
  {
    target: '[data-tour="clientes-busca"]',
    placement: 'bottom',
    title: 'Achar um cliente',
    content:
      'A busca por nome filtra ao vivo o que já está na tela. São 10 clientes por página, e o contador ao lado mostra quantos deram no filtro.',
  },
  {
    target: '[data-tour="clientes-filtros"]',
    placement: 'bottom',
    title: 'Status, Tipo e Categoria',
    content:
      'Esses três consultam o banco. Tipo é o relacionamento: Fixo é recorrente, Pontual é trabalho fechado.',
  },
  {
    target: '[data-tour="clientes-seta"]',
    placement: 'right',
    title: 'A seta abre o resumo',
    content:
      'Mostra as OS do cliente, com situação, período, valor e produtos contratados, e a lista de contribuintes. Serve para conferir sem abrir o cadastro.',
  },
  {
    target: '[data-tour="clientes-linha"]',
    placement: 'bottom',
    title: 'O clique na linha',
    content:
      'Abre o cadastro completo, em leitura. Para mexer, use o “Editar” no rodapé do modal: o da linha de uma OS ou de um contribuinte libera só aquela linha.',
  },
  {
    target: '[data-tour="clientes-novo"]',
    placement: 'left',
    title: 'Novo cliente',
    content: 'Abre o modal em branco. Aparece para administrador, líder e sublíder.',
  },
  replay,
];

// ─── Modal de cadastro: as quatro abas ───────────────────────────────────────
const modalCliente: Step[] = [
  {
    target: '[data-tour="modal-abas"]',
    placement: 'bottom',
    title: 'Quatro abas, e é nessa ordem',
    content:
      'Cliente/Grupo, Contribuintes, Representantes e OS. A ordem não é gosto: o contribuinte precisa existir para a OS escolher em quem faturar, e a OS precisa de período para o projeto nascer depois. Faturamento, Proposta e Histórico só mostram.',
  },
  {
    target: '[data-tour="cliente-nome"]',
    placement: 'bottom',
    title: 'Nome do Cliente / Grupo',
    content:
      'Obrigatório. É o nome pelo qual a casa chama o cliente: o sistema apara espaço sobrando e não mexe em maiúsculas.',
  },
  {
    target: '[data-tour="cliente-clusters"]',
    placement: 'bottom',
    title: 'Clusters, ao menos um',
    content:
      'É o cluster que decide em qual tela de área o cliente aparece. Cliente vinculado só a cluster de outra área existe, está salvo, e não aparece na sua lista.',
  },
  {
    target: '[data-tour="contrib-criar"]',
    placement: 'left',
    title: 'Um contribuinte por documento',
    content:
      'Digite o CNPJ e o sistema traz razão social, CNAE e endereço; o CEP traz logradouro, bairro, município e UF. Endereço completo é obrigatório, e em PJ entram CNAE e Simples Nacional.',
  },
  {
    target: '[data-tour="repr-criar"]',
    placement: 'left',
    title: 'Representantes',
    content:
      'Nome, cargo e e-mail são obrigatórios. A chave “Acesso Chamados” é o que libera o portal do cliente para aquela pessoa.',
  },
  {
    target: '[data-tour="modal-salvar"]',
    placement: 'top',
    title: 'Salvar',
    content:
      'Enquanto você preenche, nada fica vermelho: as marcas só aparecem depois da primeira tentativa. Na recusa, clicar no aviso do rodapé abre a aba e leva o cursor até o campo que falta.',
  },
  replayModal,
];

// ─── Modal de cadastro: a aba de OS ──────────────────────────────────────────
const modalOs: Step[] = [
  {
    target: '[data-tour="os-criar"]',
    placement: 'left',
    title: 'O número sai automático',
    content:
      'O botão calcula a próxima numeração do ano (035/2026) e abre a OS em seis seções. A Data Emissão é gravada agora e fica travada.',
  },
  {
    target: '[data-tour="os-periodo"]',
    placement: 'bottom',
    title: 'Período',
    content:
      'Início e Fim são obrigatórios porque o projeto herda os dois daqui e não tem campo de data próprio. OS sem período deixa o projeto impossível de criar.',
  },
  {
    target: '[data-tour="os-classificacao"]',
    placement: 'bottom',
    title: 'Classificação',
    content:
      'Área do Negócio e Região, as duas obrigatórias. A Área é o setor do cliente, e é ela que alimenta a coluna Setor da lista de clientes.',
  },
  {
    target: '[data-tour="os-produtos"]',
    placement: 'top',
    title: 'Produto contratado é projeto',
    content:
      'Cada produto lançado aqui vira um projeto na tela de execução. Produto esquecido é projeto que não vai existir, e o cliente nem aparece na lista de Criar Projeto.',
  },
  {
    target: '[data-tour="os-valores"]',
    placement: 'top',
    title: 'Valores',
    content:
      'O campo pede o total do contrato, não a parcela. O valor da parcela é calculado ali ao lado, e não é gravado.',
  },
  {
    target: '[data-tour="os-rateio"]',
    placement: 'top',
    title: 'Quem fatura, e o rateio',
    content:
      'Empresa que fatura, contribuinte que recebe a nota, e centros de custo somando exatamente 100%. Em cliente novo o contribuinte fica sem opções: salve, reabra o cadastro e escolha aqui.',
  },
  replayModal,
];

// ─── Projetos e tarefas ──────────────────────────────────────────────────────
const tarefas: Step[] = [
  {
    target: '[data-tour="tarefas-visoes"]',
    placement: 'bottom',
    title: 'Sete visões do mesmo dado',
    content:
      'Lista é a árvore cliente, OS, projeto e tarefa, e é onde se acompanha o escopo. Kanban mostra o andamento, Gantt mostra o período, Hoje e Futuras recortam por prazo.',
  },
  {
    target: '[data-tour="tarefas-criar-projeto"]',
    placement: 'bottom',
    title: 'Criar Projeto',
    content:
      'Abre o fluxo da OS: escolhe o cliente, escolhe a OS e cria um projeto por produto contratado. Aparece para administrador, líder e sublíder.',
  },
  {
    target: '[data-tour="tarefas-nova-tarefa"]',
    placement: 'bottom',
    title: 'Nova tarefa é outra coisa',
    content: 'Ela cria uma tarefa dentro de um projeto que já existe, e não um projeto.',
  },
  replay,
];

// ─── Diálogo de criação a partir da OS ───────────────────────────────────────
const criarProjeto: Step[] = [
  {
    target: '[data-tour="criar-lista-clientes"]',
    placement: 'bottom',
    title: 'Só quem tem o que criar',
    content:
      'A lista traz apenas cliente com OS aberta que ainda tem produto sem projeto. Não achou o seu? Ou não tem OS, ou a OS está encerrada, ou todos os produtos já viraram projeto.',
  },
  {
    target: '[data-tour="criar-lista-os"]',
    placement: 'bottom',
    title: 'A OS diz quanto falta',
    content:
      'Cada linha mostra o período e quantos produtos ainda estão sem projeto. OS sem Data Início ou Data Fim fica travada aqui, com o motivo à vista: corrija na OS, no cadastro do cliente.',
  },
  {
    target: '[data-tour="criar-confirmar"]',
    placement: 'top',
    title: 'O botão conta',
    content:
      'Ele diz quantos projetos vão nascer. Este clique não cria nada ainda: leva para a tela onde você preenche cada um.',
  },
];

// ─── Tela de lote: um cartão por produto ─────────────────────────────────────
const lote: Step[] = [
  {
    target: '[data-tour="lote-equipe"]',
    placement: 'right',
    title: 'Comece pela equipe',
    content:
      'Ela recorta as listas de líder, executor e membros. Trocar a equipe depois de preencher limpa os três, então preencher de baixo para cima faz o trabalho duas vezes.',
  },
  {
    target: '[data-tour="lote-lider"]',
    placement: 'right',
    title: 'Líder Geral',
    content: 'Aceita mais de um. Equipe com um único gestor já vem marcada.',
  },
  {
    target: '[data-tour="lote-executor"]',
    placement: 'top',
    title: 'Responsável Executor',
    content:
      'Quem executa. Para projeto tipo Canal de Chamados, escolha “Sem executor fixo”: cada chamado vira tarefa delegada, e o campo deixa de ser exigido.',
  },
  {
    target: '[data-tour="lote-membros"]',
    placement: 'top',
    title: 'Membros do Projeto',
    content:
      'Ao menos um. É essa lista que alimenta o seletor de responsável das tarefas do projeto, e não o quadro inteiro da área.',
  },
  {
    target: '[data-tour="lote-criar"]',
    placement: 'top',
    title: 'Criar',
    content:
      'O botão conta quantos cartões estão marcados. Produto que já tem projeto vem travado, com a etiqueta “Já criado”.',
  },
  replay,
];

export const TAX_TOURS: Record<TaxTourId, Step[]> = {
  clientes,
  tarefas,
  lote,
  'modal-cliente': modalCliente,
  'modal-os': modalOs,
  'criar-projeto': criarProjeto,
};

/** Rota → tour. Só as três telas; os outros três abrem com o que explicam. */
export const ROTA_PARA_TOUR: Record<string, TaxTourId> = {
  [`${TAX_PROJETOS}/clientes`]: 'clientes',
  [`${TAX_PROJETOS}/cadastro`]: 'tarefas',
  [`${TAX_PROJETOS}/cadastro-lote`]: 'lote',
};

export function resolverTourTax(pathname: string): TaxTourId | null {
  return ROTA_PARA_TOUR[pathname] ?? null;
}

export const REGISTRO_TAX: RegistroDeTour = {
  chave: 'taxTourSeen',
  tours: TAX_TOURS,
  resolve: resolverTourTax,
  // Sem isto, o guia que abre sozinho aparece como um ponto pulsante que a
  // pessoa precisa descobrir e clicar. Aqui ele já entra falando.
  opcoes: { skipBeacon: true },
};
