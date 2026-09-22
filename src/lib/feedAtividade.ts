import type { FeedFiltros } from '@/lib/feedFiltros';

/**
 * Regras puras da barra de atividade do feed.
 *
 * O banco devolve uma linha por PROJETO (migration
 * `20260922145129_feed_carimbo_de_leitura_por_cliente.sql`); o agrupamento por
 * cliente é feito aqui porque a barra precisa das duas alturas ao mesmo tempo,
 * e uma segunda consulta na expansão custaria mais do que somar a leva.
 */

/** Onde ficam os projetos sem cliente. `null` não serve de chave nem de `Map`. */
export const CLIENTE_SEM_CADASTRO = '00000000-0000-0000-0000-000000000000';

/** Como a barra chama o balde da sentinela. */
export const NOME_SEM_CLIENTE = 'Sem cliente vinculado';

/** Uma linha crua de `feed_atividade_por_cliente`: um projeto. */
export interface LinhaDeAtividade {
  client_id: string;
  client_nome: string | null;
  project_id: string;
  project_name: string | null;
  total: number;
  novos: number;
  ultimo_em: string;
  visto_ate: string;
}

export interface ProjetoComAtividade {
  projetoId: string;
  nome: string;
  total: number;
  novos: number;
  novosAgora: number;
  ultimoEm: string;
}

export interface ClienteComAtividade {
  /** A sentinela quando o projeto não tem cliente, nunca `null`. */
  clienteId: string;
  nome: string;
  total: number;
  /** Não lidas no retrato congelado: decide o balde e a ordem da linha. */
  novos: number;
  /** Não lidas agora, já descontada a leitura desta sessão: é o que a barra mostra. */
  novosAgora: number;
  ultimoEm: string;
  /** Até onde a leitura chegou neste cliente, como o banco respondeu. */
  vistoAte: string;
  projetos: ProjetoComAtividade[];
}

/** O carimbo e o dono de cada projeto, para o stream saber o que é não lido. */
export interface CarimboDoProjeto {
  clienteId: string;
  vistoAte: string;
}

/**
 * Agrupa as linhas por cliente. A ordem é o movimento mais recente primeiro, e
 * não a quantidade: ordenar por contagem faria a barra se reordenar a cada
 * leitura.
 */
export function agruparAtividadePorCliente(
  linhas: readonly LinhaDeAtividade[],
): ClienteComAtividade[] {
  const porCliente = new Map<string, ClienteComAtividade>();

  for (const linha of linhas) {
    const clienteId = linha.client_id || CLIENTE_SEM_CADASTRO;
    const projeto: ProjetoComAtividade = {
      projetoId: linha.project_id,
      nome: linha.project_name ?? 'Projeto sem nome',
      total: linha.total,
      novos: linha.novos,
      novosAgora: linha.novos,
      ultimoEm: linha.ultimo_em,
    };

    const atual = porCliente.get(clienteId);
    if (!atual) {
      porCliente.set(clienteId, {
        clienteId,
        // Nome nulo = a RLS do cadastro escondeu o cliente, mas a conversa é
        // visível. Sumir com a linha esconderia conversa que a pessoa pode ler.
        nome:
          linha.client_nome ??
          (clienteId === CLIENTE_SEM_CADASTRO ? NOME_SEM_CLIENTE : 'Cliente sem nome'),
        total: linha.total,
        novos: linha.novos,
        novosAgora: linha.novos,
        ultimoEm: linha.ultimo_em,
        vistoAte: linha.visto_ate,
        projetos: [projeto],
      });
      continue;
    }

    atual.total += linha.total;
    atual.novos += linha.novos;
    atual.novosAgora += linha.novos;
    if (linha.ultimo_em > atual.ultimoEm) atual.ultimoEm = linha.ultimo_em;
    atual.projetos.push(projeto);
  }

  const clientes = [...porCliente.values()];
  for (const cliente of clientes) {
    cliente.projetos.sort((a, b) => b.ultimoEm.localeCompare(a.ultimoEm));
  }
  return clientes.sort((a, b) => b.ultimoEm.localeCompare(a.ultimoEm));
}

/** Os dois baldes da barra. O resto não some, fica recolhido: é por ele que se
 * navega até um cliente específico. */
export function partirPorNovidade(clientes: readonly ClienteComAtividade[]): {
  novidade: ClienteComAtividade[];
  resto: ClienteComAtividade[];
} {
  return {
    novidade: clientes.filter((cliente) => cliente.novos > 0),
    resto: clientes.filter((cliente) => cliente.novos === 0),
  };
}

/**
 * Desconta o que foi lido nesta sessão sem mover nada de lugar.
 *
 * O congelamento vale para ONDE a linha fica, não para o que ela mostra: sem
 * isso a barra insiste que há novidade num projeto aberto na tela. `novos` é
 * preservado porque é dele que saem o balde e a ordem em `partirPorNovidade`.
 */
export function aplicarLeituraDaSessao(
  clientes: readonly ClienteComAtividade[],
  projetosLidos: ReadonlySet<string>,
): ClienteComAtividade[] {
  if (projetosLidos.size === 0) return clientes as ClienteComAtividade[];

  return clientes.map((cliente) => {
    const projetos = cliente.projetos.map((projeto) =>
      projetosLidos.has(projeto.projetoId) ? { ...projeto, novosAgora: 0 } : projeto,
    );
    return {
      ...cliente,
      projetos,
      novosAgora: projetos.reduce((soma, projeto) => soma + projeto.novosAgora, 0),
    };
  });
}

/** Quantas falas não lidas há no total — alimenta o contador do cabeçalho. */
export function contarNovos(clientes: readonly ClienteComAtividade[]): number {
  return clientes.reduce((soma, cliente) => soma + cliente.novosAgora, 0);
}

/**
 * De que cliente é cada projeto e até onde a leitura chegou. O stream só conhece
 * `project_id`; projeto fora da janela fica fora do mapa e conta como lido.
 */
export function carimbosPorProjeto(
  linhas: readonly LinhaDeAtividade[],
): ReadonlyMap<string, CarimboDoProjeto> {
  const mapa = new Map<string, CarimboDoProjeto>();
  for (const linha of linhas) {
    mapa.set(linha.project_id, {
      clienteId: linha.client_id || CLIENTE_SEM_CADASTRO,
      vistoAte: linha.visto_ate,
    });
  }
  return mapa;
}

/** Uma fala é novidade para mim? Nunca a minha própria, como no sino. */
export function ehNaoLida(
  comentario: { created_at: string; author_id: string | null },
  vistoAte: string | undefined,
  meuId: string | null,
): boolean {
  if (!vistoAte) return false;
  if (meuId && comentario.author_id === meuId) return false;
  return comentario.created_at > vistoAte;
}

/**
 * Com busca ou período ligados a pessoa procura coisa velha, não lê o dia:
 * carimbar apagaria novidade que ela nem viu, e o carimbo não volta atrás.
 * Cliente e projeto não desligam, porque filtrar e ler é exatamente ler.
 */
export function podeCarimbar(filtros: FeedFiltros): boolean {
  return filtros.periodo === 'sempre' && filtros.busca.trim() === '';
}

/** "1 atualização" / "12 atualizações", para a linha do cliente sem novidade. */
export function rotuloDeAtualizacoes(quantas: number): string {
  return `${quantas} ${quantas === 1 ? 'atualização' : 'atualizações'}`;
}

/** "1 nova" / "12 novas", para a etiqueta de novidade. */
export function rotuloDeNovas(quantas: number): string {
  return `${quantas} ${quantas === 1 ? 'nova' : 'novas'}`;
}

/**
 * Blocos lidos (por projeto) viram um carimbo por cliente, com o instante mais
 * alto. Evita duas chamadas competindo pelo mesmo cliente; a incoerência em si
 * já é barrada pelo `GREATEST` do banco.
 */
export function consolidarCarimbos(
  lidos: readonly { projetoId: string; ate: string }[],
  carimbos: ReadonlyMap<string, CarimboDoProjeto>,
): Map<string, string> {
  const porCliente = new Map<string, string>();
  for (const { projetoId, ate } of lidos) {
    const carimbo = carimbos.get(projetoId);
    if (!carimbo) continue;
    const atual = porCliente.get(carimbo.clienteId);
    if (!atual || ate > atual) porCliente.set(carimbo.clienteId, ate);
  }
  return porCliente;
}
