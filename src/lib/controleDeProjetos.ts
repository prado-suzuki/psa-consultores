// O que o Controle de Projetos mostra, e por que cada recorte é esse.
//
// A TELA É DE ÁREA, não da OSG: o que muda entre OSG e Tax é o cluster que
// entra em `clusterDaArea`, e mais nada. Ela nasceu na OSG em 15/09/2026 e
// ganhou a Tax em 17/09; os números medidos nos comentários abaixo são os da
// OSG em produção, que é onde eles foram levantados.
//
// Substitui, na OSG, a planilha `Relação de Projetos - OSG.xlsx`. A análise que sustenta
// o desenho está em `docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`;
// aqui fica só a regra, pura, porque "quais linhas aparecem" é decisão que
// precisa de teste e não de leitura de hook com I/O.
//
// O GRÃO É O PRODUTO CONTRATADO DA OS, e essa decisão foi tomada duas vezes: a
// primeira, pelo grão da OS, estava errada.
//
// O erro apareceu na pergunta "por que tem produto como Planejamento Tributário
// que o responsável é o Tax". No grão da OS os produtos viram uma lista dentro
// de uma célula, e o responsável de cada um desaparece dentro dela. Medido em
// produção em 15/09/2026, a Família Lunardi (OS 100/2026) é o caso inteiro num
// cliente só: três produtos da OSG com a Anne Strini, e cinco da TAX com a
// Monica Matunaga e a Geizi Andrade. A tela mostrava os três primeiros e uma
// pessoa. São 12 produtos da TAX escondidos em 8 OS.
//
// No grão do produto, cada linha carrega a própria área e o próprio executor:
// 169 linhas para as 84 OS, contra 84 linhas que escondiam 12 produtos.

import { STATUS_LABELS } from '@/lib/projetosCadastro';
import { REGIAO_OPTIONS } from '@/lib/regioes';

/**
 * As áreas que têm Controle de Projetos.
 *
 * É um subconjunto de `PageCategory`, e não um tipo novo solto: a área serve
 * para resolver o cluster (`useDomainClusterPorCategoria`) e para nomear a
 * própria área na tela (`AREAS`, em `lib/nomeDaArea.ts`). Abrir a tela para uma
 * terceira área é acrescentar a chave aqui — as três pontas são as mesmas.
 */
export type AreaDoControle = 'osg' | 'tax' | 'auditoria' | 'juridico';

/** OS crua, como as colunas de `ordem_servico` a devolvem. */
export interface OrdemCrua {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  regiao: string | null;
}

export interface ProdutoContratado {
  ordem_servico_id: string;
  produto_segmento_id: string;
}

export interface ProdutoSegmento {
  id: string;
  nome: string | null;
  cluster_id: string | null;
}

export interface ProjetoDaOrdem {
  id: string;
  name: string;
  status: string | null;
  ordem_servico_id: string | null;
  produto_segmento_id: string | null;
  responsible_id: string | null;
  leader_id: string | null;
  description: string | null;
}

export interface ClienteCru {
  id: string;
  nome: string;
  ativo: boolean | null;
}

export interface PessoaCrua {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/** Uma linha da tela: um produto contratado de uma OS. */
export interface LinhaDoControle {
  /** Única por linha. A mesma OS aparece uma vez por produto. */
  chave: string;
  osId: string;
  numeroOs: string;
  clienteId: string;
  clienteNome: string;
  /** Cliente inativo continua na lista: sumir com trabalho parado é o oposto do que a tela faz. */
  clienteAtivo: boolean;
  produtoId: string;
  produtoNome: string;
  /** Nome do cluster que responde pelo produto. É o que distingue OSG de TAX na mesma OS. */
  area: string;
  /** `true` quando o produto é da área desta página. */
  daArea: boolean;
  /**
   * Quem executa o produto: `org_projects.responsible_id` do projeto DESTE
   * produto. Vazio = produto contratado sem projeto criado. É a coluna B da
   * planilha (Equipe OSG).
   *
   * É UMA COLUNA DA TABELA, e não o agrupamento da tela — decidido em
   * 17/09/2026, depois de a tela ter aberto agrupada por executor. Agrupar
   * cobrava dois preços: o produto de dois executores entrava nos dois grupos
   * (a soma das contagens passava do total, de propósito, mas passava), e ler a
   * tabela inteira exigia abrir e fechar bloco. Como coluna, ela ordena junto
   * com as outras dez e a linha aparece uma vez só.
   */
  executores: string[];
  /**
   * O Líder Geral do projeto (`leader_id`), que é a coluna C da planilha
   * (Gestor). Separado do executor de propósito: a planilha sempre teve as duas
   * colunas, e juntar as duas numa só apagava quem responde pelo trabalho.
   */
  lideres: string[];
  /** Quantos projetos existem para este par OS/produto. Zero = ninguém criou. */
  projetos: number;
  regiao: string | null;
  /**
   * O status DO PRODUTO: a chave de `org_projects.status`, ou `SEM_PROJETO`.
   *
   * `SEM_PROJETO` não é um status de projeto, é a ausência de um. A primeira
   * versão herdava a situação da OS aqui, e o efeito era a tela escrever "Ativo"
   * num produto que ninguém abriu — afirmar que o trabalho corre quando não
   * existe nem quem o toque. Herdar parecia mais informativo e era menos
   * verdadeiro.
   */
  status: string;
  /** A situação crua da OS, que o filtro ainda usa. */
  situacaoDaOs: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  /** `data_fim` no passado e a OS ainda não concluída nem cancelada. */
  prazoVencido: boolean;
  /**
   * A descrição do projeto daquele produto — o mesmo `org_projects.description`
   * que o modal de projeto edita, e por isso sem texto próprio desta tela.
   *
   * Vazia quando não há projeto, ou quando o projeto existe e ninguém preencheu.
   * Dos três pares com mais de um projeto em produção, vale a primeira descrição
   * preenchida: concatenar duas descrições daria um parágrafo que não é de
   * nenhum dos dois.
   */
  descricao: string;
}

/**
 * Produto contratado que não tem projeto criado. Não é `org_projects.status`:
 * é a ausência de linha em `org_projects` para aquele par (OS, produto).
 */
export const SEM_PROJETO = 'sem_projeto';

/** Estados que contam como trabalho em aberto, para efeito de prazo. */
export const STATUS_EM_ABERTO = [SEM_PROJETO, 'planned', 'active', 'on_hold'];

/**
 * O rótulo de um `org_projects.status`, na palavra do CADASTRO.
 *
 * A fonte é `STATUS_LABELS`, a mesma que a tabela e o modal de projeto já usam.
 * A planilha chama de "Hibernando" o que o sistema chama de "Pausado", e a tela
 * segue o sistema: rótulo que só esta página usa faria duas telas darem nomes
 * diferentes ao mesmo valor do banco.
 */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Sem status';
  if (status === SEM_PROJETO) return 'Sem projeto';
  return STATUS_LABELS[status] ?? status;
}

function nomeDaPessoa(pessoa: PessoaCrua | undefined): string | null {
  if (!pessoa) return null;
  const nome = `${pessoa.first_name ?? ''} ${pessoa.last_name ?? ''}`.trim();
  return nome || null;
}

/**
 * Prazo vencido: a data da OS ficou para trás e o produto ainda não fechou.
 *
 * O prazo é da OS (o produto não tem data própria) e o estado é do produto, que
 * é o que torna a conta útil no grão novo: numa OS vencida, o produto já
 * concluído não pisca e o que continua aberto pisca.
 *
 * `hoje` entra por parâmetro para o teste não depender do relógio. A comparação
 * é entre strings ISO de propósito, porque `data_fim` é `date` e virar `Date`
 * aqui traria fuso para uma conta que não tem hora.
 */
export function prazoVencido(dataFim: string | null, status: string, hoje: string): boolean {
  if (!dataFim) return false;
  if (!STATUS_EM_ABERTO.includes(status)) return false;
  return dataFim < hoje;
}

/**
 * Monta as linhas da tela: uma por produto contratado.
 *
 * QUAIS OS ENTRAM: as que contratam ao menos um produto do cluster desta página,
 * lido em `produto_segmento.cluster_id`. Não é `ordem_servico.cluster_id`, que é
 * o campo Empresa / Faturamento e responde "quem emitiu a nota", não "de quem é
 * o trabalho". A mesma troca já foi feita em `ordensDaArea.ts` em 03/09/2026, e
 * lá ela revelou 17 OS invisíveis.
 *
 * QUAIS PRODUTOS ENTRAM: TODOS os da OS que entrou, inclusive os de outra área,
 * cada um marcado com a própria área em `area`. É o oposto do que `ordensDaArea`
 * faz, e de propósito: lá a pergunta é "que documento esta OS me obriga a pedir",
 * e produto de outra área só produziria trabalho que não é meu. Aqui a pergunta é
 * "onde este cliente está", e metade do trabalho dele estar com a TAX é resposta,
 * não ruído. `daArea` deixa a tela distinguir os dois sem esconder nenhum.
 *
 * RESPONSÁVEIS vêm do projeto DAQUELE produto, casado por (OS, produto):
 * `ordem_servico` não tem responsável e o projeto tem. Três pares têm mais de um
 * projeto em produção, então a lista sai sem repetição. Produto sem projeto fica
 * com a coluna vazia, o que é informação e não falha: é a distância entre o que
 * foi vendido e o que alguém está tocando.
 */
export function montarControleDeProjetos(
  ordens: OrdemCrua[],
  produtosContratados: ProdutoContratado[],
  produtoPorId: Map<string, ProdutoSegmento>,
  projetos: ProjetoDaOrdem[],
  clientePorId: Map<string, ClienteCru>,
  pessoaPorId: Map<string, PessoaCrua>,
  nomeDoCluster: Map<string, string>,
  clusterDaArea: string,
  hoje: string,
): LinhaDoControle[] {
  const contratadosDaOs = new Map<string, ProdutoContratado[]>();
  const osQualifica = new Set<string>();
  for (const contratado of produtosContratados) {
    const atuais = contratadosDaOs.get(contratado.ordem_servico_id) ?? [];
    atuais.push(contratado);
    contratadosDaOs.set(contratado.ordem_servico_id, atuais);
    const produto = produtoPorId.get(contratado.produto_segmento_id);
    if (produto?.cluster_id === clusterDaArea) osQualifica.add(contratado.ordem_servico_id);
  }

  // Projetos indexados pelo PAR (OS, produto). Projeto sem `produto_segmento_id`
  // fica de fora de qualquer linha — são 2 em produção, e pendurá-los num
  // produto arbitrário poria o responsável no lugar errado.
  const projetosDoPar = new Map<string, ProjetoDaOrdem[]>();
  for (const projeto of projetos) {
    if (!projeto.ordem_servico_id || !projeto.produto_segmento_id) continue;
    const chave = `${projeto.ordem_servico_id}::${projeto.produto_segmento_id}`;
    const atuais = projetosDoPar.get(chave) ?? [];
    atuais.push(projeto);
    projetosDoPar.set(chave, atuais);
  }

  const linhas: LinhaDoControle[] = [];
  for (const ordem of ordens) {
    if (!osQualifica.has(ordem.id)) continue;

    const cliente = clientePorId.get(ordem.id_cliente);

    for (const contratado of contratadosDaOs.get(ordem.id) ?? []) {
      const produto = produtoPorId.get(contratado.produto_segmento_id);
      const doPar = projetosDoPar.get(`${ordem.id}::${contratado.produto_segmento_id}`) ?? [];

      const executores = new Set<string>();
      const lideres = new Set<string>();
      for (const projeto of doPar) {
        const lider = nomeDaPessoa(pessoaPorId.get(projeto.leader_id ?? ''));
        const executor = nomeDaPessoa(pessoaPorId.get(projeto.responsible_id ?? ''));
        if (lider) lideres.add(lider);
        if (executor) executores.add(executor);
      }

      // Dois projetos no mesmo par com status diferente: vale o mais aberto, que
      // é o primeiro da ordem do ciclo de vida. Fechar a linha porque um dos
      // dois fechou esconderia trabalho que continua correndo.
      const status =
        doPar.length === 0
          ? SEM_PROJETO
          : ([...STATUS_EM_ABERTO, 'completed', 'cancelled'].find((chave) =>
              doPar.some((projeto) => projeto.status === chave),
            ) ??
            doPar[0].status ??
            SEM_PROJETO);

      linhas.push({
        chave: `${ordem.id}::${contratado.produto_segmento_id}`,
        osId: ordem.id,
        numeroOs: ordem.numero_os ?? '',
        clienteId: ordem.id_cliente,
        // Cliente fora do alcance da RLS não some da lista: ver `isDoAmbiente`,
        // que segue a mesma regra. Some o nome, não a linha.
        clienteNome: cliente?.nome ?? 'Cliente não identificado',
        clienteAtivo: cliente?.ativo !== false,
        produtoId: contratado.produto_segmento_id,
        produtoNome: produto?.nome ?? 'Produto não identificado',
        area: (produto?.cluster_id && nomeDoCluster.get(produto.cluster_id)) || 'Sem área',
        daArea: produto?.cluster_id === clusterDaArea,
        executores: [...executores].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        lideres: [...lideres].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        projetos: doPar.length,
        regiao: ordem.regiao ?? null,
        status,
        situacaoDaOs: ordem.situacao ?? null,
        dataInicio: ordem.data_inicio ?? null,
        dataFim: ordem.data_fim ?? null,
        prazoVencido: prazoVencido(ordem.data_fim ?? null, status, hoje),
        descricao: doPar.map((projeto) => projeto.description?.trim() ?? '').find(Boolean) ?? '',
      });
    }
  }

  return linhas.sort(comparaPadrao);
}

/**
 * A ordem de chegada: cliente, depois a área desta página primeiro, depois
 * produto.
 *
 * A área entra no meio porque a linha da TAX num cliente da OSG é contexto, e
 * não o trabalho de quem abriu a tela. Intercalar as duas por nome de produto
 * faria a pessoa caçar as próprias linhas dentro do bloco do cliente.
 */
function comparaPadrao(a: LinhaDoControle, b: LinhaDoControle): number {
  const porCliente = a.clienteNome.localeCompare(b.clienteNome, 'pt-BR');
  if (porCliente !== 0) return porCliente;
  if (a.daArea !== b.daArea) return a.daArea ? -1 : 1;
  return a.produtoNome.localeCompare(b.produtoNome, 'pt-BR');
}

export interface FiltrosDoControle {
  busca: string;
  status: string;
  regiao: string;
  /** `''` = todas; senão o nome do cluster. */
  area: string;
}

export const FILTROS_VAZIOS: FiltrosDoControle = {
  busca: '',
  status: '',
  regiao: '',
  area: '',
};

/**
 * Aplica os filtros da barra. A busca cobre cliente, OS, produto e executor: é
 * o campo em que a equipe achava o cliente na planilha com Ctrl+F.
 */
export function filtrarControle(
  linhas: LinhaDoControle[],
  filtros: FiltrosDoControle,
): LinhaDoControle[] {
  const busca = filtros.busca.trim().toLowerCase();
  return linhas.filter((linha) => {
    if (filtros.status && linha.status !== filtros.status) return false;
    if (filtros.regiao && linha.regiao !== filtros.regiao) return false;
    if (filtros.area && linha.area !== filtros.area) return false;
    if (!busca) return true;
    const alvo = [
      linha.clienteNome,
      linha.numeroOs,
      linha.produtoNome,
      linha.executores.join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return alvo.includes(busca);
  });
}

/**
 * As opções dos seletores, tiradas do que a lista TEM e não do domínio inteiro:
 * filtro que oferece praça sem nenhuma OS só produz tela vazia. A região sai na
 * ordem de `REGIAO_OPTIONS`, que é a ordem que o cadastro de OS já usa.
 */
export function opcoesDoControle(linhas: LinhaDoControle[]) {
  const statuses = [...new Set(linhas.map((linha) => linha.status).filter(Boolean))];
  const areas = [...new Set(linhas.map((linha) => linha.area))];
  const regioesPresentes = new Set(linhas.map((linha) => linha.regiao).filter(Boolean));
  const regioes = REGIAO_OPTIONS.map((opcao) => opcao.value).filter((valor) =>
    regioesPresentes.has(valor),
  );
  // Praça fora da lista de sete (o cadastro deixa texto livre) entra no fim,
  // senão ela some do filtro e as OS dela viram inalcançáveis.
  for (const regiao of regioesPresentes) {
    if (regiao && !regioes.includes(regiao)) regioes.push(regiao);
  }
  return {
    statuses: statuses.sort((a, b) => statusLabel(a).localeCompare(statusLabel(b), 'pt-BR')),
    regioes,
    areas: areas.sort((a, b) => a.localeCompare(b, 'pt-BR')),
  };
}

/* ── Ordenação clicável ──────────────────────────────────────────────────
 *
 * Mesma regra que a matriz de `/equipe/acessos` já usa (ver `proximaOrdem` em
 * `filtroDeUsuarios.ts`): **crescente → decrescente → padrão**. O terceiro
 * clique existe porque tabela sem desfazer obriga a recarregar a página para
 * recuperar a leitura original, que aqui é cliente, área desta página, produto.
 *
 * DUAS DECISÕES QUE NÃO SÃO ÓBVIAS:
 *
 * **Vazio fica sempre por último**, nos dois sentidos, sem inverter com a
 * direção. Ordenar por Prazo com nulo no topo enterraria as OS com prazo, que
 * são o motivo de clicar ali. O mesmo na coluna Executor, onde produto sem
 * projeto é a maioria esmagadora (131 de 169 em produção): em ordem crescente
 * eles empurrariam para baixo as 38 linhas que têm gente.
 *
 * **Todo critério desempata pela ordem padrão.** Situação tem três valores para
 * 169 linhas; sem desempate, a ordem dentro de cada bloco ficaria à mercê do que
 * o banco devolveu, e a tabela pareceria instável sem estar.
 */

export type ColunaDoControle =
  | 'cliente'
  | 'os'
  | 'area'
  | 'produto'
  | 'regiao'
  | 'status'
  | 'inicio'
  | 'prazo'
  | 'executor'
  | 'gestor'
  | 'descricao';

export interface OrdemDoControle {
  /** `'padrao'` = cliente, área desta página, produto. */
  campo: ColunaDoControle | 'padrao';
  ascendente: boolean;
}

export const ORDEM_PADRAO: OrdemDoControle = { campo: 'padrao', ascendente: true };

/**
 * A ordem em que a tela ABRE: Data Fim crescente, o prazo mais próximo em cima.
 *
 * Não é a mesma coisa que `ORDEM_PADRAO`, e as duas precisam existir separadas.
 * `ORDEM_PADRAO` é para onde o TERCEIRO clique num cabeçalho volta — cliente,
 * área desta página, produto —, que continua sendo a leitura de referência da
 * tabela. Esta é só o estado inicial.
 *
 * Por que o prazo abre na frente: a pergunta de quem abre a tela é "o que vence
 * primeiro", não "qual cliente vem antes no alfabeto". O que já venceu sobe
 * junto, porque está mais no passado que qualquer prazo futuro — e é justamente
 * o que a coluna marca com o ⚠.
 *
 * Linha sem Data Fim continua por último (ver `estaVazio`).
 */
export const ORDEM_INICIAL: OrdemDoControle = { campo: 'prazo', ascendente: true };

/**
 * O próximo estado do clique num cabeçalho.
 *
 * Clicar numa coluna diferente recomeça o ciclo nela em vez de herdar o sentido
 * da anterior: herdar faria o primeiro clique numa coluna nova cair em
 * decrescente sem ninguém ter pedido.
 */
export function proximaOrdemDoControle(
  atual: OrdemDoControle,
  campo: ColunaDoControle,
): OrdemDoControle {
  if (atual.campo !== campo) return { campo, ascendente: true };
  if (atual.ascendente) return { campo, ascendente: false };
  return ORDEM_PADRAO;
}

/**
 * O número da OS ordenado por ANO e depois por sequência, e não como texto.
 *
 * Como texto, "096/2026" vem antes de "106/2026" por acaso (o zero à esquerda),
 * e "200/2025" viria depois das duas. Produção tem as duas grafias.
 */
function chaveDaOs(numeroOs: string): [number, number] {
  const partes = numeroOs.split('/');
  const sequencia = Number.parseInt(partes[0] ?? '', 10);
  const ano = Number.parseInt(partes[1] ?? '', 10);
  return [Number.isNaN(ano) ? 0 : ano, Number.isNaN(sequencia) ? 0 : sequencia];
}

function valorDaColuna(linha: LinhaDoControle, campo: ColunaDoControle): string | number {
  switch (campo) {
    case 'cliente':
      return linha.clienteNome.toLocaleLowerCase('pt-BR');
    case 'os': {
      const [ano, sequencia] = chaveDaOs(linha.numeroOs);
      return ano * 10000 + sequencia;
    }
    case 'area':
      return linha.area.toLocaleLowerCase('pt-BR');
    case 'produto':
      return linha.produtoNome.toLocaleLowerCase('pt-BR');
    case 'regiao':
      return linha.regiao ?? '';
    case 'status':
      return statusLabel(linha.status).toLocaleLowerCase('pt-BR');
    case 'inicio':
      return linha.dataInicio ?? '';
    case 'prazo':
      return linha.dataFim ?? '';
    case 'executor':
      return linha.executores.join(', ').toLocaleLowerCase('pt-BR');
    case 'gestor':
      return linha.lideres.join(', ').toLocaleLowerCase('pt-BR');
    case 'descricao':
      return linha.descricao.toLocaleLowerCase('pt-BR');
  }
}

function estaVazio(linha: LinhaDoControle, campo: ColunaDoControle): boolean {
  switch (campo) {
    case 'cliente':
    case 'area':
    case 'produto':
      return false;
    case 'os':
      return !linha.numeroOs;
    case 'regiao':
      return !linha.regiao;
    case 'status':
      return !linha.status;
    case 'inicio':
      return !linha.dataInicio;
    case 'prazo':
      return !linha.dataFim;
    case 'executor':
      return linha.executores.length === 0;
    case 'gestor':
      return linha.lideres.length === 0;
    case 'descricao':
      return !linha.descricao;
  }
}

/** Ordena pela `ordem` pedida. Não muta a lista recebida. */
export function ordenarControle(
  linhas: LinhaDoControle[],
  ordem: OrdemDoControle,
): LinhaDoControle[] {
  if (ordem.campo === 'padrao') return [...linhas].sort(comparaPadrao);
  const campo = ordem.campo;

  return [...linhas].sort((a, b) => {
    const aVazio = estaVazio(a, campo);
    const bVazio = estaVazio(b, campo);
    // O vazio não inverte com a direção: ver o cabeçalho desta seção.
    if (aVazio !== bVazio) return aVazio ? 1 : -1;
    if (aVazio && bVazio) return comparaPadrao(a, b);

    const valorA = valorDaColuna(a, campo);
    const valorB = valorDaColuna(b, campo);
    let comparacao: number;
    if (typeof valorA === 'number' && typeof valorB === 'number') {
      comparacao = valorA - valorB;
    } else {
      comparacao = String(valorA).localeCompare(String(valorB), 'pt-BR');
    }
    if (comparacao !== 0) return ordem.ascendente ? comparacao : -comparacao;
    return comparaPadrao(a, b);
  });
}

/* ── Agrupar por ─────────────────────────────────────────────────────────
 *
 * A tabela é PLANA por padrão, e o agrupamento é uma escolha da barra — mesmo
 * desenho do "Agrupar por" da tela de Projetos (`groupProjects` em
 * `projetosCadastro.ts`), que é de onde esta tela já tira o modal.
 *
 * A tela abriu agrupada por executor até 17/09/2026. O agrupamento fixo era o
 * problema, não o agrupamento: quem quer ler "o que é de cada um" liga o
 * critério, e quem quer ler a tabela inteira não paga bloco para abrir.
 *
 * TRÊS CRITÉRIOS, e não os nove que a tabela tem de coluna. Área, Status e
 * Região já são FILTRO na mesma barra — agrupar por eles seria a mesma
 * pergunta respondida duas vezes. Sobram os três eixos pelos quais a planilha
 * era lida: quem toca, de quem é, e o que foi vendido.
 *
 * NO CRITÉRIO EXECUTOR, SÃO DOIS GRUPOS SEM GENTE, E NÃO UM. A primeira versão
 * juntava os dois num "sem responsável" de 131 linhas, e eles pedem ações
 * diferentes:
 *
 * - **Sem projeto aberto** (127 em produção): produto vendido, numa OS
 *   assinada, sem linha em `org_projects`. Não há o que delegar, há o que
 *   CRIAR. Parte deles é trabalho que aconteceu fora da ferramenta e nunca foi
 *   registrado, e o banco não distingue os dois casos — a tela afirma só o que
 *   sabe, que é "isto foi vendido e não está sendo acompanhado aqui".
 * - **Projeto sem responsável** (4): a linha existe, o `responsible_id` está
 *   nulo. Aí sim é um campo a preencher.
 *
 * Os dois vêm PRIMEIRO, nessa ordem, porque não são sobra: são o que a tela
 * descobriu. Enterrá-los embaixo dos executores esconderia o achado.
 *
 * Produto com dois executores entra nos DOIS grupos. A soma das contagens passa
 * do total, e é o certo: a pergunta que o agrupamento responde é "o que é meu",
 * e uma linha que é de duas pessoas é de cada uma delas. Sem agrupamento a
 * linha continua aparecendo uma vez só, com os dois nomes na coluna.
 */

export type AgrupamentoDoControle = 'nenhum' | 'executor' | 'cliente' | 'produto';

/** Como a tela abre: plana. */
export const AGRUPAMENTO_PADRAO: AgrupamentoDoControle = 'nenhum';

/** As duas chaves reservadas dos grupos sem gente, no critério executor. */
export const GRUPO_SEM_PROJETO = '__sem_projeto__';
export const GRUPO_SEM_RESPONSAVEL = '__sem_responsavel__';

export interface GrupoDoControle {
  /** Única por grupo: nome do executor, id do cliente ou do produto, ou uma das reservadas. */
  chave: string;
  /** O que a faixa escreve. */
  rotulo: string;
  linhas: LinhaDoControle[];
  /** Clientes distintos dentro do grupo. A faixa esconde isto quando agrupa POR cliente. */
  clientes: number;
  /** Linhas com prazo vencido dentro do grupo. */
  vencidas: number;
  /** Produto vendido sem projeto criado: não há o que delegar, há o que criar. */
  semProjeto: boolean;
  /** Projeto criado com `responsible_id` nulo: aí sim é um campo a preencher. */
  semResponsavel: boolean;
}

/** As chaves de grupo de uma linha. Só o executor pode devolver mais de uma. */
function chavesDoGrupo(
  linha: LinhaDoControle,
  criterio: Exclude<AgrupamentoDoControle, 'nenhum'>,
): Array<{ chave: string; rotulo: string }> {
  if (criterio === 'cliente') {
    return [{ chave: linha.clienteId, rotulo: linha.clienteNome }];
  }
  if (criterio === 'produto') {
    return [{ chave: linha.produtoId, rotulo: linha.produtoNome }];
  }
  if (linha.executores.length > 0) {
    return linha.executores.map((nome) => ({ chave: nome, rotulo: nome }));
  }
  return linha.status === SEM_PROJETO
    ? [{ chave: GRUPO_SEM_PROJETO, rotulo: 'Sem projeto aberto' }]
    : [{ chave: GRUPO_SEM_RESPONSAVEL, rotulo: 'Projeto sem responsável' }];
}

/**
 * Agrupa pelo critério pedido, PRESERVANDO a ordem que recebe: é isso que faz
 * cada grupo abrir com o prazo mais próximo em cima, sem o agrupamento ter de
 * saber da ordenação. `'nenhum'` devolve `null`, que é a tabela plana.
 *
 * A ORDEM DOS GRUPOS MUDA COM O CRITÉRIO, de propósito:
 *
 * - **Executor:** os dois grupos sem gente primeiro (ver o cabeçalho desta
 *   seção), depois do maior para o menor — quem carrega dez produtos é quem a
 *   tela precisa mostrar antes. Empate desempata por nome, para a ordem não
 *   depender do que o banco devolveu.
 * - **Cliente e produto:** alfabético, que é como se procura um nome que já se
 *   sabe. Ordenar cliente por tamanho faria caçar. Mesma regra do
 *   `groupProjects` de Projetos, incluindo o "Sem ..." por último.
 */
export function agruparControle(
  linhas: LinhaDoControle[],
  criterio: AgrupamentoDoControle,
): GrupoDoControle[] | null {
  if (criterio === 'nenhum') return null;

  const porChave = new Map<string, GrupoDoControle>();
  for (const linha of linhas) {
    for (const { chave, rotulo } of chavesDoGrupo(linha, criterio)) {
      const atual = porChave.get(chave);
      if (atual) {
        atual.linhas.push(linha);
        continue;
      }
      porChave.set(chave, {
        chave,
        rotulo,
        linhas: [linha],
        clientes: 0,
        vencidas: 0,
        semProjeto: chave === GRUPO_SEM_PROJETO,
        semResponsavel: chave === GRUPO_SEM_RESPONSAVEL,
      });
    }
  }

  const grupos = [...porChave.values()];
  for (const grupo of grupos) {
    grupo.clientes = new Set(grupo.linhas.map((linha) => linha.clienteId)).size;
    grupo.vencidas = grupo.linhas.filter((linha) => linha.prazoVencido).length;
  }

  if (criterio !== 'executor') {
    return grupos.sort((a, b) => {
      const aSem = a.rotulo.startsWith('Sem ');
      const bSem = b.rotulo.startsWith('Sem ');
      if (aSem !== bSem) return aSem ? 1 : -1;
      return a.rotulo.localeCompare(b.rotulo, 'pt-BR');
    });
  }

  // Ordem fixa nos dois primeiros: "sem projeto" antes de "sem responsável",
  // porque criar é o gesto maior e o grupo é trinta vezes maior.
  const peso = (grupo: GrupoDoControle) => (grupo.semProjeto ? 0 : grupo.semResponsavel ? 1 : 2);
  return grupos.sort((a, b) => {
    if (peso(a) !== peso(b)) return peso(a) - peso(b);
    if (a.linhas.length !== b.linhas.length) return b.linhas.length - a.linhas.length;
    return a.rotulo.localeCompare(b.rotulo, 'pt-BR');
  });
}
