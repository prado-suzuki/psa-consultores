// O que o Controle de Projetos da OSG mostra, e por que cada recorte é esse.
//
// Substitui a planilha `Relação de Projetos - OSG.xlsx`. A análise que sustenta
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

import { SITUACAO_PROJETO_OPTIONS } from '@/components/equipe/client-form/constants';
import { REGIAO_OPTIONS } from '@/lib/regioes';

/** OS crua, como as colunas de `ordem_servico` a devolvem. */
export interface OrdemCrua {
  id: string;
  numero_os: string | null;
  id_cliente: string;
  situacao: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
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
   * planilha (Equipe OSG) e a chave do agrupamento da tela.
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
  situacao: string | null;
  dataInicio: string | null;
  dataFim: string | null;
  observacoes: string | null;
  /** `data_fim` no passado e a OS ainda não concluída nem cancelada. */
  prazoVencido: boolean;
}

/** Situações que contam como trabalho em aberto, para efeito de prazo vencido. */
export const SITUACOES_EM_ABERTO = ['em_andamento', 'suspenso'];

/**
 * O rótulo de uma `ordem_servico.situacao`, na palavra do CADASTRO.
 *
 * A fonte é `SITUACAO_PROJETO_OPTIONS`, a mesma lista que o cadastro de OS usa
 * no seletor. A planilha chama de "Hibernando" o que o sistema grava como
 * `suspenso`, e a tela segue o sistema: rótulo que só esta página usa faria duas
 * telas darem nomes diferentes ao mesmo valor do banco.
 */
export function situacaoLabel(situacao: string | null | undefined): string {
  if (!situacao) return 'Sem situação';
  return SITUACAO_PROJETO_OPTIONS.find((opcao) => opcao.value === situacao)?.label ?? situacao;
}

function nomeDaPessoa(pessoa: PessoaCrua | undefined): string | null {
  if (!pessoa) return null;
  const nome = `${pessoa.first_name ?? ''} ${pessoa.last_name ?? ''}`.trim();
  return nome || null;
}

/**
 * OS vencida: prazo no passado e trabalho ainda aberto.
 *
 * `hoje` entra por parâmetro para o teste não depender do relógio. A comparação
 * é entre strings ISO de propósito, porque `data_fim` é `date` e virar `Date`
 * aqui traria fuso para uma conta que não tem hora.
 */
export function prazoVencido(
  dataFim: string | null,
  situacao: string | null,
  hoje: string,
): boolean {
  if (!dataFim) return false;
  if (!situacao || !SITUACOES_EM_ABERTO.includes(situacao)) return false;
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
    const vencido = prazoVencido(ordem.data_fim ?? null, ordem.situacao ?? null, hoje);

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
        situacao: ordem.situacao ?? null,
        dataInicio: ordem.data_inicio ?? null,
        dataFim: ordem.data_fim ?? null,
        observacoes: ordem.observacoes?.trim() || null,
        prazoVencido: vencido,
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
  situacao: string;
  regiao: string;
  /** `''` = todas; senão o nome do cluster. */
  area: string;
}

export const FILTROS_VAZIOS: FiltrosDoControle = {
  busca: '',
  situacao: '',
  regiao: '',
  area: '',
};

/**
 * Aplica os filtros da barra. A busca cobre cliente, OS, produto, executor e
 * observação:
 * é o campo em que a equipe achava o cliente na planilha com Ctrl+F, e a
 * observação é onde mora o motivo de o trabalho estar parado.
 */
export function filtrarControle(
  linhas: LinhaDoControle[],
  filtros: FiltrosDoControle,
): LinhaDoControle[] {
  const busca = filtros.busca.trim().toLowerCase();
  return linhas.filter((linha) => {
    if (filtros.situacao && linha.situacao !== filtros.situacao) return false;
    if (filtros.regiao && linha.regiao !== filtros.regiao) return false;
    if (filtros.area && linha.area !== filtros.area) return false;
    if (!busca) return true;
    const alvo = [
      linha.clienteNome,
      linha.numeroOs,
      linha.produtoNome,
      linha.executores.join(' '),
      linha.observacoes ?? '',
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
  const situacoes = [...new Set(linhas.map((linha) => linha.situacao).filter(Boolean))] as string[];
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
    situacoes: situacoes.sort((a, b) => situacaoLabel(a).localeCompare(situacaoLabel(b), 'pt-BR')),
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
  | 'situacao'
  | 'inicio'
  | 'prazo'
  | 'executor'
  | 'gestor'
  | 'observacao';

export interface OrdemDoControle {
  /** `'padrao'` = cliente, área desta página, produto. */
  campo: ColunaDoControle | 'padrao';
  ascendente: boolean;
}

export const ORDEM_PADRAO: OrdemDoControle = { campo: 'padrao', ascendente: true };

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
    case 'situacao':
      return situacaoLabel(linha.situacao).toLocaleLowerCase('pt-BR');
    case 'inicio':
      return linha.dataInicio ?? '';
    case 'prazo':
      return linha.dataFim ?? '';
    case 'executor':
      return linha.executores.join(', ').toLocaleLowerCase('pt-BR');
    case 'gestor':
      return linha.lideres.join(', ').toLocaleLowerCase('pt-BR');
    case 'observacao':
      return (linha.observacoes ?? '').toLocaleLowerCase('pt-BR');
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
    case 'situacao':
      return !linha.situacao;
    case 'inicio':
      return !linha.dataInicio;
    case 'prazo':
      return !linha.dataFim;
    case 'executor':
      return linha.executores.length === 0;
    case 'gestor':
      return linha.lideres.length === 0;
    case 'observacao':
      return !linha.observacoes;
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

/* ── Agrupamento por executor ────────────────────────────────────────────
 *
 * A tela abre agrupada por quem executa, que é `org_projects.responsible_id` do
 * projeto daquele produto. É a coluna B da planilha (Equipe OSG), onde a equipe
 * lia "o que é meu" antes de ler qualquer outra coisa.
 *
 * O GRUPO SEM RESPONSÁVEL VEM PRIMEIRO, e é o maior: 131 dos 169 produtos
 * contratados, em 72 dos 82 clientes, não têm projeto criado. Ele encabeça a
 * tela porque não é sobra, é fila de delegação: produto vendido que ninguém
 * está tocando é a coisa mais urgente que esta tela tem a dizer, e enterrá-lo
 * embaixo de oito grupos pequenos faria a tela esconder justamente o que ela
 * descobriu.
 *
 * Ele abre FECHADO, apesar de vir primeiro. São 131 linhas, e abertas elas
 * empurrariam os oito executores para fora da primeira tela — o cabeçalho com a
 * contagem diz o tamanho sem custar a rolagem.
 *
 * Produto com dois executores entra nos DOIS grupos. A soma das contagens passa
 * do total, e é o certo: a pergunta que o agrupamento responde é "o que é meu",
 * e uma linha que é de duas pessoas é de cada uma delas.
 */

export interface GrupoDoControle {
  /** Nome do executor, ou `''` no grupo sem responsável. */
  executor: string;
  linhas: LinhaDoControle[];
  /** Clientes distintos dentro do grupo. */
  clientes: number;
  /** Linhas com prazo vencido dentro do grupo. */
  vencidas: number;
  /** `true` só no grupo sem responsável, que vem primeiro e abre fechado. */
  semResponsavel: boolean;
}

/**
 * Agrupa por executor: "sem responsável" primeiro, depois do maior para o menor.
 *
 * Maior primeiro, e não alfabético, porque quem carrega dez produtos é quem a
 * tela precisa mostrar antes; empate desempata por nome, para a ordem não
 * depender do que o banco devolveu.
 */
export function agruparPorExecutor(linhas: LinhaDoControle[]): GrupoDoControle[] {
  const porExecutor = new Map<string, LinhaDoControle[]>();
  for (const linha of linhas) {
    const chaves = linha.executores.length > 0 ? linha.executores : [''];
    for (const chave of chaves) {
      const atuais = porExecutor.get(chave) ?? [];
      atuais.push(linha);
      porExecutor.set(chave, atuais);
    }
  }

  const grupos: GrupoDoControle[] = [];
  for (const [executor, doGrupo] of porExecutor) {
    grupos.push({
      executor,
      linhas: doGrupo,
      clientes: new Set(doGrupo.map((linha) => linha.clienteId)).size,
      vencidas: doGrupo.filter((linha) => linha.prazoVencido).length,
      semResponsavel: executor === '',
    });
  }

  return grupos.sort((a, b) => {
    if (a.semResponsavel !== b.semResponsavel) return a.semResponsavel ? -1 : 1;
    if (a.linhas.length !== b.linhas.length) return b.linhas.length - a.linhas.length;
    return a.executor.localeCompare(b.executor, 'pt-BR');
  });
}
