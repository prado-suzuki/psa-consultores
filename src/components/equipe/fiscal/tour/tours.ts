// Guias autoguiados da Tax: o manual de cadastro dentro da própria ferramenta.
//
// DESENHO DO GUIA DO CADASTRO, a pedido dela: primeiro uma passada por TODAS as
// abas, dizendo o que cada uma é, e só então o detalhe do que fazer em cada uma.
// Quem troca de aba é o guia, no `before` de cada passo do detalhe: sem isso os
// passos de Contribuintes e Representantes nem apareciam, porque a âncora deles
// só existe com aquela aba aberta, e o provider descarta passo sem âncora.
//
// A régua da escrita: UMA ideia por passo, no máximo duas linhas. O primeiro
// desenho juntava as quatro abas, a ordem delas e o que as outras três fazem num
// passo só, e virou parágrafo dentro de um tooltip de 340px. Passo a mais é
// barato, é um clique em "Próximo"; passo comprido, não. O porquê de cada regra
// continua nos manuais em PDF: o guia aponta, o manual explica.
//
// O detalhe da OS não entra aqui, e não é esquecimento: as seções dela só
// existem com uma OS selecionada e em edição, e um alvo que some no meio do
// caminho faz o Joyride pular para o último passo. A aba de OS tem o guia dela
// (`modal-os`), que abre quando a pessoa entra na aba, quando as seções existem.

import type { Step } from 'react-joyride';
import type { PassoDeTour, RegistroDeTour } from '@/components/tour/TourProvider';

export type TaxTourId =
  | 'clientes'
  | 'tarefas'
  | 'lote'
  // Abrem com o que explicam:
  | 'modal-leitura'
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

/**
 * Abre a aba do cadastro antes do passo, e espera o conteúdo trocar.
 *
 * Devolve uma função porque o Joyride chama `before` no momento do passo. Quando
 * a aba já está aberta, resolve na hora: voltar um passo não pisca a tela.
 */
const abrirAba = (aba: string) => () =>
  new Promise<void>((resolve) => {
    const gatilho = document.querySelector<HTMLElement>(`[data-tour="modal-aba-${aba}"]`);
    if (!gatilho || gatilho.getAttribute('aria-selected') === 'true') {
      resolve();
      return;
    }
    gatilho.click();
    window.setTimeout(resolve, 340);
  });

/** Marca todos os passos de um bloco com a aba que eles precisam. */
const naAba = (aba: string, passos: PassoDeTour[]): PassoDeTour[] =>
  passos.map((passo) => ({
    ...passo,
    before: abrirAba(aba),
    exige: `[data-tour="modal-aba-${aba}"]`,
  }));

// ─── Tela de Clientes ────────────────────────────────────────────────────────
const clientes: PassoDeTour[] = [
  {
    target: '[data-tour="clientes-busca"]',
    placement: 'bottom',
    title: 'Buscar',
    content: 'Filtra ao vivo, pelo nome, o que já está na tela.',
  },
  {
    target: '[data-tour="clientes-filtros"]',
    placement: 'bottom',
    title: 'Filtros',
    content: 'Status, Tipo e Categoria recortam a lista inteira.',
  },
  {
    target: '[data-tour="clientes-seta"]',
    placement: 'right',
    title: 'A seta abre o resumo',
    content: 'Mostra as OS e os contribuintes do cliente, sem abrir o cadastro.',
  },
  {
    target: '[data-tour="clientes-linha"]',
    placement: 'bottom',
    title: 'Clicar na linha',
    content: 'Abre o cadastro completo, em leitura.',
  },
  {
    target: '[data-tour="clientes-novo"]',
    placement: 'left',
    title: 'Novo cliente',
    content: 'Abre o cadastro em branco.',
  },
  replay,
];

// ─── Modal em leitura: o que dá para fazer neste estado ──────────────────────
const modalLeitura: PassoDeTour[] = [
  {
    target: '[data-tour="modal-abas"]',
    placement: 'bottom',
    title: 'O cadastro tem sete abas',
    content: 'Quatro se preenchem. Faturamento, Proposta e Histórico só mostram.',
  },
  {
    target: '[data-tour="modal-editar"]',
    placement: 'top',
    title: 'Está em leitura',
    content: 'O “Editar” libera o cadastro, e o guia de preenchimento abre junto.',
  },
  replayModal,
];

// ─── Cadastro, parte 1: uma passada por todas as abas ────────────────────────
const visaoGeral: PassoDeTour[] = [
  {
    target: '[data-tour="modal-abas"]',
    placement: 'bottom',
    title: 'Primeiro, o mapa',
    content: 'Uma passada pelas abas, e depois o que fazer em cada uma.',
  },
  {
    target: '[data-tour="modal-aba-cliente"]',
    placement: 'bottom',
    title: 'Aba 1 · Cliente/Grupo',
    content: 'Quem é o cliente: nome, categoria e os clusters.',
  },
  {
    target: '[data-tour="modal-aba-contribuintes"]',
    placement: 'bottom',
    title: 'Aba 2 · Contribuintes',
    content: 'Um cadastro por CNPJ ou CPF. É quem recebe a nota.',
  },
  {
    target: '[data-tour="modal-aba-representantes"]',
    placement: 'bottom',
    title: 'Aba 3 · Representantes',
    content: 'Os contatos do cliente, e quem entra no portal de chamados.',
  },
  {
    target: '[data-tour="modal-aba-contratos"]',
    placement: 'bottom',
    title: 'Aba 4 · OS',
    content: 'O contrato: período, produtos, valores e rateio.',
  },
  {
    target: '[data-tour="modal-aba-faturamento"]',
    placement: 'bottom',
    title: 'Faturamento não se preenche',
    content: 'É espelho: mostra o que já foi gravado na OS e no contribuinte.',
  },
  {
    target: '[data-tour="modal-aba-historico"]',
    placement: 'bottom',
    title: 'Proposta e Histórico',
    content: 'A proposta anexada, e quem mexeu no cadastro.',
  },
  {
    target: '[data-tour="modal-abas"]',
    placement: 'bottom',
    title: 'A ordem importa',
    content: 'O contribuinte precisa existir antes da OS, e a OS antes do projeto.',
  },
];

// ─── Cadastro, parte 2: o detalhe de cada aba ────────────────────────────────
const detalheCliente = naAba('cliente', [
  {
    target: '[data-tour="cliente-nome"]',
    placement: 'bottom',
    title: 'Nome',
    content: 'Obrigatório. É como a casa chama o cliente.',
  },
  {
    target: '[data-tour="cliente-clusters"]',
    placement: 'bottom',
    title: 'Clusters',
    content: 'Obrigatório. É o cluster que decide em qual área o cliente aparece.',
  },
]);

const detalheContribuintes = naAba('contribuintes', [
  {
    target: '[data-tour="contrib-criar"]',
    placement: 'left',
    title: 'Um cadastro por documento',
    content: 'Digite o CNPJ e razão social, CNAE e endereço vêm da consulta.',
  },
  {
    target: '[data-tour="contrib-criar"]',
    placement: 'left',
    title: 'O endereço é obrigatório',
    content: 'CEP, logradouro, bairro, município e UF. O CEP traz os quatro.',
  },
]);

const detalheRepresentantes = naAba('representantes', [
  {
    target: '[data-tour="repr-criar"]',
    placement: 'left',
    title: 'Nome, cargo e e-mail',
    content: 'Os três são obrigatórios.',
  },
  {
    target: '[data-tour="repr-criar"]',
    placement: 'left',
    title: 'Acesso Chamados',
    content: 'A chave que libera o portal do cliente para aquela pessoa.',
  },
]);

const detalheOs = naAba('contratos', [
  {
    target: '[data-tour="os-criar"]',
    placement: 'left',
    title: 'A OS tem guia próprio',
    content: 'Ele abre sozinho ao entrar nesta aba, e o “?” reabre quando quiser.',
  },
]);

const fecharCadastro: PassoDeTour[] = [
  {
    target: '[data-tour="modal-salvar"]',
    placement: 'top',
    title: 'Salvar',
    content: 'As marcas de campo obrigatório só aparecem na 1ª tentativa.',
  },
  {
    target: '[data-tour="modal-salvar"]',
    placement: 'top',
    title: 'Se recusar',
    content: 'Clique no aviso do rodapé: ele abre a aba e leva até o campo.',
  },
  replayModal,
];

const modalCliente: PassoDeTour[] = [
  ...visaoGeral,
  ...detalheCliente,
  ...detalheContribuintes,
  ...detalheRepresentantes,
  ...detalheOs,
  ...fecharCadastro,
];

// ─── Modal de cadastro: a aba de OS ──────────────────────────────────────────
const modalOs: PassoDeTour[] = [
  {
    target: '[data-tour="os-criar"]',
    placement: 'left',
    title: 'Criar nova OS',
    content: 'O número sai automático, no formato 035/2026.',
  },
  {
    target: '[data-tour="os-periodo"]',
    placement: 'bottom',
    title: 'Período',
    content: 'Início e Fim são obrigatórios: o projeto herda as datas daqui.',
  },
  {
    target: '[data-tour="os-classificacao"]',
    placement: 'bottom',
    title: 'Classificação',
    content: 'Área do Negócio e Região, as duas obrigatórias.',
  },
  {
    target: '[data-tour="os-produtos"]',
    placement: 'top',
    title: 'Produto é projeto',
    content: 'Cada produto lançado aqui vira um projeto na tela de execução.',
  },
  {
    target: '[data-tour="os-valores"]',
    placement: 'top',
    title: 'Valores',
    content: 'O campo pede o total do contrato, não a parcela.',
  },
  {
    target: '[data-tour="os-rateio"]',
    placement: 'top',
    title: 'Faturamento e rateio',
    content: 'Quem fatura, quem recebe a nota, e centros de custo fechando 100%.',
  },
  replayModal,
];

// ─── Projetos e tarefas ──────────────────────────────────────────────────────
const tarefas: PassoDeTour[] = [
  {
    target: '[data-tour="tarefas-visoes"]',
    placement: 'bottom',
    title: 'Sete visões do mesmo dado',
    content: 'Lista é a árvore cliente, OS, projeto e tarefa.',
  },
  {
    target: '[data-tour="tarefas-criar-projeto"]',
    placement: 'bottom',
    title: 'Criar Projeto',
    content: 'Cria um projeto por produto contratado da OS.',
  },
  {
    target: '[data-tour="tarefas-nova-tarefa"]',
    placement: 'bottom',
    title: 'Nova tarefa',
    content: 'Cria tarefa dentro de um projeto que já existe. Não cria projeto.',
  },
  replay,
];

// ─── Diálogo de criação a partir da OS ───────────────────────────────────────
const criarProjeto: PassoDeTour[] = [
  {
    target: '[data-tour="criar-lista-clientes"]',
    placement: 'bottom',
    title: 'A lista é curta',
    content: 'Só aparece quem tem OS aberta com produto ainda sem projeto.',
  },
  {
    target: '[data-tour="criar-lista-os"]',
    placement: 'bottom',
    title: 'Escolher a OS',
    content: 'Cada linha diz quantos produtos ainda estão sem projeto.',
  },
  {
    target: '[data-tour="criar-confirmar"]',
    placement: 'top',
    title: 'O botão conta',
    content: 'Este clique ainda não cria: leva para a tela de preenchimento.',
  },
];

// ─── Tela de lote: um cartão por produto ─────────────────────────────────────
const lote: PassoDeTour[] = [
  {
    target: '[data-tour="lote-equipe"]',
    placement: 'right',
    title: 'Comece pela equipe',
    content: 'Ela recorta as listas de líder, executor e membros.',
  },
  {
    target: '[data-tour="lote-lider"]',
    placement: 'right',
    title: 'Líder Geral',
    content: 'Aceita mais de um.',
  },
  {
    target: '[data-tour="lote-executor"]',
    placement: 'top',
    title: 'Responsável Executor',
    content: 'Quem executa. “Sem executor fixo” é para Canal de Chamados.',
  },
  {
    target: '[data-tour="lote-membros"]',
    placement: 'top',
    title: 'Membros',
    content: 'Ao menos um. É desta lista que sai o responsável das tarefas.',
  },
  {
    target: '[data-tour="lote-criar"]',
    placement: 'top',
    title: 'Criar',
    content: 'Conta os cartões marcados. Produto já criado vem travado.',
  },
  replay,
];

export const TAX_TOURS: Record<TaxTourId, Step[]> = {
  clientes,
  tarefas,
  lote,
  'modal-leitura': modalLeitura,
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
