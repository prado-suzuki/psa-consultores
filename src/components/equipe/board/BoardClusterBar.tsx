import { Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClusters } from '@/hooks/useClusters';
import { useBoardCluster } from '@/hooks/useBoardCluster';

/**
 * Rotas do Board que HONRAM a empresa global.
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

/** Radix rejeita `value=""` em SelectItem — "todas" precisa de um sentinela. */
const TODAS = '__todas__';

/**
 * Faixa de seleção de EMPRESA do Board.
 *
 * NOME: a entidade é `estrutura_clusters` — daí `cluster` no código. Na tela é
 * "Empresa" porque é literalmente o que a linha é: `estrutura_clusters` tem
 * `nome_empresa` e `cnpj`, uma pessoa jurídica por linha (ver
 * `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md`). O cadastro
 * da OS já chama o mesmo `cluster_id` de "Empresa / Faturamento" — é o
 * vocabulário que o time usa.
 *
 * NÃO é "Área": `estrutura_areas` é um nível ABAIXO (uma empresa tem várias) e é
 * ela que carrega o centro de custo. Nem "Cliente": esse é a tabela `cliente`,
 * as empresas ATENDIDAS, e colidiria com o filtro de `Clientes e OS`.
 *
 * Diferença deliberada para o OSG Work: lá, ficar sem cliente BLOQUEIA as
 * ferramentas, e a barra pulsa para cobrar a escolha. Aqui, "Todas as empresas"
 * é o estado normal e desejado do sócio — a visão do grupo inteiro. Alarme sobre
 * o estado padrão seria gritar lobo.
 */
export const BoardClusterBar = () => {
  const { cluster, setCluster } = useBoardCluster();
  const { data: clusters = [], isLoading } = useClusters();

  const ativos = clusters.filter((c) => c.ativo);
  const inativos = clusters.filter((c) => !c.ativo);
  const selecionado = clusters.find((c) => c.id === cluster);
  const todas = !cluster;

  return (
    <div
      className="px-6 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
      style={{
        backgroundColor: todas ? 'var(--board-card)' : 'var(--board-v4-blue-t)',
        borderBottom: '1px solid var(--board-border)',
      }}
    >
      <div className="flex items-center gap-2 whitespace-nowrap">
        <div
          className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: todas ? 'var(--board-v4-line2)' : 'var(--board-v4-accent)',
            color: todas ? 'var(--board-v4-ink3)' : '#fff',
          }}
        >
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <Label
          className="text-[11px] font-bold uppercase tracking-[0.09em]"
          style={{ color: 'var(--board-v4-ink3)' }}
        >
          Empresa
        </Label>
      </div>

      <div className="flex-1 max-w-md">
        <Select
          value={cluster || TODAS}
          onValueChange={(v) => setCluster(v === TODAS ? '' : v)}
          disabled={isLoading}
        >
          <SelectTrigger
            className="h-9 text-[13px] font-medium"
            style={{
              backgroundColor: 'var(--board-v4-surface)',
              borderColor: todas ? 'var(--board-v4-line)' : 'var(--board-v4-accent)',
            }}
          >
            <SelectValue placeholder={isLoading ? 'Carregando…' : 'Todas as empresas'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as empresas</SelectItem>
            {ativos.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
            {/* Inativas no fim: continuam filtráveis para olhar histórico. */}
            {inativos.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} (inativa)</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-[11.5px] truncate" style={{ color: 'var(--board-v4-ink3)' }}>
        {todas
          ? 'Visão do grupo inteiro — escolha uma empresa para recortar a página'
          : <>Filtrando por: <strong style={{ color: 'var(--board-v4-ink)' }}>{selecionado?.nome ?? '—'}</strong></>}
      </div>
    </div>
  );
};
