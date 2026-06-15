import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { useClusterFiltroOpcoes } from '@/hooks/useClusters';
import Select from './Select';
import { DicaIcon } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

/** Barra global de seleção de cliente — paridade visual com OsgWorkClienteBar.
 *  '' = "Todos os clusters": páginas funcionam mas a barra entra em estado de
 *  atenção (pulso + borda destacada) para induzir a seleção de um cliente. */
export default function ClusterBar() {
  const { cluster, setCluster } = useClusterGlobal();
  const opcoes = useClusterFiltroOpcoes();
  const semCluster = !cluster;
  const selecionado = opcoes.find((o) => o.value === cluster);

  return (
    <div className={`cluster-bar${semCluster ? ' sem-cluster' : ''}`} data-tour="cluster-bar">
      <div className="cluster-bar-id">
        <span className="cluster-bar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
          </svg>
        </span>
        <span className="cluster-bar-label">Cliente <DicaIcon text={dica('comum.cluster')} /></span>
      </div>
      <div className="cluster-bar-select">
        <Select
          id="cluster-global"
          value={cluster}
          onChange={setCluster}
          options={opcoes}
          ariaLabel="Filtrar todas as páginas por cliente"
        />
      </div>
      {semCluster ? (
        <div className="cluster-bar-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Selecione um cliente para filtrar as páginas</span>
        </div>
      ) : (
        <div className="cluster-bar-working" key={cluster}>
          Trabalhando em: <strong>{selecionado?.label}</strong>
        </div>
      )}
    </div>
  );
}
