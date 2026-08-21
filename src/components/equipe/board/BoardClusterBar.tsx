import { Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useBoardHierarquia } from '@/hooks/useBoardHierarquia';

/**
 * Rotas do Board que HONRAM o recorte global CLUSTER -> ÁREA -> EQUIPE.
 *
 * A barra só aparece nestas. Um seletor visível numa tela que o ignora é pior
 * que seletor nenhum: o sócio filtra, o número não muda, e ele passa a
 * desconfiar de todos os números do Board. Página nova entra nesta lista no
 * mesmo commit em que passa a consumir `useBoardCluster`.
 */
export const ROTAS_COM_CLUSTER_GLOBAL: string[] = [
  '/equipe/board/dashboard',
  '/equipe/board/performance',
  '/equipe/board/dashboard-clientes-os',
];

export const honraClusterGlobal = (pathname: string): boolean =>
  ROTAS_COM_CLUSTER_GLOBAL.includes(pathname);

/** Radix rejeita `value=""` em SelectItem — "todos" precisa de um sentinela. */
const TODOS = '__todos__';

/**
 * Faixa de seleção CLUSTER -> ÁREA -> EQUIPE do Board (Bloco G, 21/08 --
 * cascata; rótulo "Cluster" corrigido no Bloco D, mesmo dia).
 *
 * A entidade do nível 1 é `estrutura_clusters`, e ela FOI PROJETADA para ser
 * a empresa de faturamento -- decisão documentada em
 * `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md` (17/08),
 * com colunas `nome_empresa`, `cnpj` e `cost_center_id` dedicadas a isso.
 * Rotulado "Cluster" aqui, não "Empresa": medido no banco, `nome_empresa`
 * está preenchido nos 11 clusters com NOME DE MENTIRA do gerador de dado de
 * semente (TAX = "Cerrado Logística S.A."...) -- e `estrutura_clusters` não
 * tem coluna `ambiente`, então isso vale em produção também. A tela não pode
 * dizer "Empresa" sem mentir enquanto isso não for cadastrado de verdade; é
 * tarefa de cadastro, não de código. Também não é "Área" (colidiria com o
 * nível 2 desta mesma cascata, `estrutura_areas`).
 *
 * Cascata: ÁREA só aparece com um cluster selecionado E mais de uma área
 * visível nele -- com uma área só, mostra o nome como texto, sem dropdown
 * redundante. Mesma regra para EQUIPE dentro da área. Visibilidade de cada
 * nível: ativo OU com movimento (ver `useBoardHierarquia`) -- é o que faz o
 * cluster "Prado Advogados" (inativo, duas áreas ativas com OS rateada
 * dentro) continuar aparecendo.
 *
 * Diferença deliberada para o OSG Work: lá, ficar sem cliente BLOQUEIA as
 * ferramentas, e a barra pulsa para cobrar a escolha. Aqui, "Todos" é o
 * estado normal e desejado do sócio — a visão do grupo inteiro. Alarme sobre
 * o estado padrão seria gritar lobo.
 */
export const BoardClusterBar = () => {
  const { cluster, setCluster, area, setArea, equipe, setEquipe } = useBoardCluster();
  const { isLoading, clusters, areasPorCluster, equipesPorArea } = useBoardHierarquia();

  const clusterSelecionado = clusters.find((c) => c.id === cluster);
  const areasDoCluster = cluster ? areasPorCluster.get(cluster) ?? [] : [];
  const areaSelecionada = areasDoCluster.find((a) => a.id === area);
  const equipesDaArea = area ? equipesPorArea.get(area) ?? [] : [];
  const equipeSelecionada = equipesDaArea.find((e) => e.id === equipe);

  const todos = !cluster;
  const mostrarSeletorDeArea = !!cluster && areasDoCluster.length > 1;
  const mostrarNomeDeAreaUnica = !!cluster && areasDoCluster.length === 1;
  const mostrarSeletorDeEquipe = !!area && equipesDaArea.length > 1;
  const mostrarNomeDeEquipeUnica = !!area && equipesDaArea.length === 1;

  return (
    <div
      className="px-6 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-wrap"
      style={{
        backgroundColor: todos ? 'var(--board-card)' : 'var(--board-v4-blue-t)',
        borderBottom: '1px solid var(--board-border)',
      }}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: todos ? 'var(--board-v4-line2)' : 'var(--board-v4-accent)',
            color: todos ? 'var(--board-v4-ink3)' : '#fff',
          }}
        >
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <Label
          className="text-[11px] font-bold uppercase tracking-[0.09em]"
          style={{ color: 'var(--board-v4-ink3)' }}
        >
          Cluster
        </Label>
      </div>

      <div className="flex-1 max-w-md">
        <Select
          value={cluster || TODOS}
          onValueChange={(v) => setCluster(v === TODOS ? '' : v)}
          disabled={isLoading}
        >
          <SelectTrigger
            className="h-9 text-[13px] font-medium"
            style={{
              backgroundColor: 'var(--board-v4-surface)',
              borderColor: todos ? 'var(--board-v4-line)' : 'var(--board-v4-accent)',
            }}
          >
            <SelectValue placeholder={isLoading ? 'Carregando…' : 'Todos'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos</SelectItem>
            {clusters.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}{!c.ativo ? ' (inativo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Nível 2 -- ÁREA. Só quando o cluster tem mais de uma. */}
      {mostrarSeletorDeArea && (
        <div className="w-full md:w-56">
          <Select value={area || TODOS} onValueChange={(v) => setArea(v === TODOS ? '' : v)}>
            <SelectTrigger className="h-9 text-[13px] font-medium" style={{ backgroundColor: 'var(--board-v4-surface)' }}>
              <SelectValue placeholder="Todas as áreas" />
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
        </div>
      )}
      {mostrarNomeDeAreaUnica && (
        <span className="text-[12.5px]" style={{ color: 'var(--board-v4-ink3)' }}>
          Área: <strong style={{ color: 'var(--board-v4-ink)' }}>{areasDoCluster[0].nome}</strong>
        </span>
      )}

      {/* Nível 3 -- EQUIPE. Só quando a área tem mais de uma. */}
      {mostrarSeletorDeEquipe && (
        <div className="w-full md:w-56">
          <Select value={equipe || TODOS} onValueChange={(v) => setEquipe(v === TODOS ? '' : v)}>
            <SelectTrigger className="h-9 text-[13px] font-medium" style={{ backgroundColor: 'var(--board-v4-surface)' }}>
              <SelectValue placeholder="Todas as equipes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todas as equipes</SelectItem>
              {equipesDaArea.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {mostrarNomeDeEquipeUnica && (
        <span className="text-[12.5px]" style={{ color: 'var(--board-v4-ink3)' }}>
          Equipe: <strong style={{ color: 'var(--board-v4-ink)' }}>{equipesDaArea[0].nome}</strong>
        </span>
      )}

      <div className="text-[11.5px] truncate" style={{ color: 'var(--board-v4-ink3)' }}>
        {todos
          ? 'Visão do grupo inteiro — escolha um cluster para recortar a página'
          : (
            <>
              Filtrando por: <strong style={{ color: 'var(--board-v4-ink)' }}>{clusterSelecionado?.nome ?? '—'}</strong>
              {areaSelecionada && <> · <strong style={{ color: 'var(--board-v4-ink)' }}>{areaSelecionada.nome}</strong></>}
              {equipeSelecionada && <> · <strong style={{ color: 'var(--board-v4-ink)' }}>{equipeSelecionada.nome}</strong></>}
            </>
          )}
      </div>
    </div>
  );
};
