import { useLocation } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';
import { eClusterLegado } from '@/lib/boardLegado';
import { BoardRecorteBar } from '@/components/equipe/board/BoardRecorteBar';

/**
 * Rotas do Board que HONRAM o recorte global CLUSTER -> ÁREA -> EQUIPE.
 *
 * O seletor só entra nestas, e entra à direita do título — nunca como faixa
 * própria. Página nova entra nesta lista no mesmo commit em que passa a
 * consumir `useBoardCluster`.
 */
export const ROTAS_COM_CLUSTER_GLOBAL: string[] = [
  '/equipe/board/dashboard',
  '/equipe/board/performance',
  '/equipe/board/dashboard-clientes-os',
  '/equipe/board/clientes',
  '/equipe/board/uso-envio',
];

export const honraClusterGlobal = (pathname: string): boolean =>
  ROTAS_COM_CLUSTER_GLOBAL.includes(pathname);

/** Cliente, ano e mês — só a diretoria (não o Operacional nem a Gerencial Tax/OSG). */
export const ROTAS_COM_RECORTE_NEGOCIO: string[] = [
  '/equipe/board/dashboard',
  '/equipe/board/uso-envio',
  '/equipe/board/dashboard-clientes-os',
  '/equipe/board/clientes',
];

export const honraRecorteNegocio = (pathname: string): boolean =>
  ROTAS_COM_RECORTE_NEGOCIO.includes(pathname);

/** Radix rejeita `value=""` em SelectItem — "todos" precisa de um sentinela. */
const TODOS = '__todos__';

/**
 * Recorte CLUSTER → ÁREA → EQUIPE, compacto, para a direita do título.
 *
 * A entidade do nível 1 é `estrutura_clusters` (empresa de faturamento).
 * Rotulado "Cluster", não "Empresa": `nome_empresa` ainda carrega nome de
 * semente. Cascata: ÁREA só com cluster escolhido e mais de uma área;
 * EQUIPE só com área escolhida e mais de uma equipe. "Todos" é o estado
 * normal do sócio — visão do grupo.
 */
export const BoardClusterBar = () => {
  const { pathname } = useLocation();
  const { cluster, setCluster, area, setArea, equipe, setEquipe } = useBoardCluster();
  const { isLoading, clusters, areasPorCluster, equipesPorArea } = useBoardHierarquia();
  const mostrarRecorte = honraRecorteNegocio(pathname);
  const clustersVivos = clusters.filter((c) => !eClusterLegado(c.nome));

  const areasDoCluster = cluster ? areasPorCluster.get(cluster) ?? [] : [];
  const equipesDaArea = area ? equipesPorArea.get(area) ?? [] : [];
  const mostrarSeletorDeArea = !!cluster && areasDoCluster.length > 1;
  const mostrarSeletorDeEquipe = !!area && equipesDaArea.length > 1;
  const trigger = {
    backgroundColor: 'var(--bd-surface)',
    borderColor: cluster ? 'var(--bd-accent)' : 'var(--bd-line)',
  };

  return (
    <div className="bd-cluster" aria-label="Recorte de cluster">
      <Select
        value={cluster || TODOS}
        onValueChange={(v) => setCluster(v === TODOS ? '' : v)}
        disabled={isLoading}
      >
        <SelectTrigger className="h-8 w-[176px] rounded-md text-[12.5px] font-medium" style={trigger}>
          <SelectValue placeholder={isLoading ? 'Carregando…' : 'Todos os clusters'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os clusters</SelectItem>
          {clustersVivos.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}{!c.ativo ? ' (inativo)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mostrarSeletorDeArea && (
        <Select value={area || TODOS} onValueChange={(v) => setArea(v === TODOS ? '' : v)}>
          <SelectTrigger className="h-8 w-[150px] rounded-md text-[12.5px] font-medium" style={{ backgroundColor: 'var(--bd-surface)', borderColor: 'var(--bd-line)' }}>
            <SelectValue placeholder="Áreas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as áreas</SelectItem>
            {areasDoCluster.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.nome}{!a.ativo ? ' (inativa)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {mostrarSeletorDeEquipe && (
        <Select value={equipe || TODOS} onValueChange={(v) => setEquipe(v === TODOS ? '' : v)}>
          <SelectTrigger className="h-8 w-[150px] rounded-md text-[12.5px] font-medium" style={{ backgroundColor: 'var(--bd-surface)', borderColor: 'var(--bd-line)' }}>
            <SelectValue placeholder="Equipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as equipes</SelectItem>
            {equipesDaArea.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {mostrarRecorte && <BoardRecorteBar />}
    </div>
  );
};
