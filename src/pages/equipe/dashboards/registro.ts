/**
 * Catalogo dos dashboards da pagina `/equipe/dashboards`.
 *
 * Para publicar um dashboard novo, acrescente UMA entrada em `DASHBOARDS`.
 * A pagina host cuida de seletor, rota, titulo e carregamento — nada mais
 * precisa ser tocado.
 *
 * Duas regras que valem a pena respeitar:
 *
 *   1. `id` entra na URL (`?painel=<id>`). Depois de publicado ele vira link
 *      que as pessoas salvam, entao nao renomeie: crie outro.
 *   2. O componente e carregado sob demanda. Abrir a pagina nao deve baixar
 *      o codigo de todos os dashboards, so o do que esta em tela.
 *
 * O componente registrado recebe o CONTEUDO da tela: nada de shell, cabecalho
 * ou titulo — isso e da pagina host, e e o que mantem os dashboards
 * visualmente consistentes entre si.
 *
 * Quando algum dashboard precisar de permissao propria, o caminho e adicionar
 * um `pagePath` opcional aqui e filtrar a lista na host com `usePageAccess`.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Activity, type LucideIcon } from 'lucide-react';

export interface DashboardRegistrado {
  /** Slug estavel usado em `?painel=`. Nao renomear apos publicar. */
  id: string;
  /** Rotulo no seletor. */
  nome: string;
  /** Uma linha: vira subtitulo da pagina e apoio no seletor. */
  descricao: string;
  icone: LucideIcon;
  componente: LazyExoticComponent<ComponentType>;
  /** Dispara o download do chunk antes do clique (hover/foco no seletor). */
  precarregar: () => Promise<unknown>;
}

const carregarControleUsoEnvio = () =>
  import('@/components/equipe/dashboards/ControleUsoEnvio').then((modulo) => ({
    default: modulo.ControleUsoEnvio,
  }));

export const DASHBOARDS: DashboardRegistrado[] = [
  {
    id: 'controle-uso-envio',
    nome: 'Controle de uso e envio',
    descricao: 'Saúde da API, tráfego por ferramenta e ingestão de documentos',
    icone: Activity,
    componente: lazy(carregarControleUsoEnvio),
    precarregar: carregarControleUsoEnvio,
  },
];

export const DASHBOARD_PADRAO = DASHBOARDS[0];

/** Um `?painel=` desconhecido cai no padrao em vez de deixar a tela vazia. */
export function resolverDashboard(id: string | null): DashboardRegistrado {
  return DASHBOARDS.find((dashboard) => dashboard.id === id) ?? DASHBOARD_PADRAO;
}
