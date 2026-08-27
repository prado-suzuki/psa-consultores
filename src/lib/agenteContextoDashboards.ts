/**
 * Snapshot do Board · Dashboards (biblioteca do Looker) para o Agente PSA.
 *
 * Esta tela é diferente de todas as outras do Board: **o número não está no
 * app.** O conteúdo é um `iframe` do Looker Studio, e nem a tela nem o agente
 * conseguem ler o que está desenhado lá dentro.
 *
 * Publicar um snapshot aqui parece inútil — e seria, se o objetivo fosse
 * responder sobre os números. O objetivo é o oposto: que o agente saiba
 * DIZER QUE NÃO SABE, com precisão. Sem este snapshot ele responderia "esta
 * tela ainda não publica seus números", que soa como defeito; com ele,
 * responde que o relatório é externo, quais existem, e para onde ir.
 *
 * Por isso o bloco de aviso vem PRIMEIRO: é a informação mais importante da
 * tela para quem pergunta.
 */
import type { BlocoContexto, ContextoTela } from '@/hooks/useAgenteContexto';

export interface DashboardDaBiblioteca {
  name: string;
  /** Como o relatório é recortado (por cliente, por área...). */
  filter_type: string;
  /** Link do procedimento, quando cadastrado. */
  sop_url: string | null;
}

export interface EntradaContextoDashboards {
  dashboards: DashboardDaBiblioteca[];
  /** Nome do relatório aberto no momento, se houver. */
  selecionado: string | null;
  carregando: boolean;
  falhas: string[];
}

const SUGESTOES = [
  'Quais relatórios eu tenho liberados nesta tela?',
  'Você consegue ler o que está dentro do relatório?',
];

export function contextoBoardDashboards(e: EntradaContextoDashboards): ContextoTela {
  const aviso: BlocoContexto = {
    id: 'limite',
    titulo: 'O que esta tela mostra, e o que ela NÃO entrega ao agente',
    campos: [
      {
        rotulo: 'Natureza do conteúdo',
        valor: 'relatório externo do Looker Studio, embutido em iframe',
        nota: 'os números vivem no Looker, fora do banco do sistema',
      },
      {
        rotulo: 'O agente consegue ler os números do relatório?',
        valor: 'não',
        nota: 'nenhum valor do relatório chega até aqui — responder sobre eles '
          + 'seria invenção, não leitura',
      },
      {
        rotulo: 'Relatório aberto agora',
        valor: e.selecionado,
        nota: e.selecionado === null ? 'nenhum selecionado' : undefined,
      },
    ],
  };

  const blocos: BlocoContexto[] = [aviso];

  if (e.dashboards.length > 0) {
    blocos.push({
      id: 'biblioteca',
      titulo: 'Relatórios liberados para você',
      nota: 'A lista respeita o seu acesso (`dashboard_access`, resolvido no servidor) — '
        + 'outra pessoa pode ver uma lista diferente.',
      campos: [{ rotulo: 'Relatórios disponíveis', valor: String(e.dashboards.length) }],
      itens: e.dashboards.map((d) => ({
        relatorio: d.name,
        recorte: d.filter_type,
        tem_procedimento: d.sop_url ? 'sim' : 'não',
      })),
    });
  }

  return {
    rotulo: 'Board · Dashboards (biblioteca do Looker Studio)',
    filtros: {
      relatório: e.selecionado ?? 'nenhum aberto',
    },
    blocos,
    avisos: e.falhas.length > 0 ? [`falha ao carregar: ${e.falhas.join(', ')}`] : undefined,
    sugestoes: SUGESTOES,
  };
}
