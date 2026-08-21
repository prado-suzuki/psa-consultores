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
 * Faixa de seleção de ÁREA do Board.
 *
 * Rótulo corrigido em 21/08 (Bloco D, verificação ao vivo com acesso direto
 * ao banco). A entidade é `estrutura_clusters`, e ela FOI PROJETADA para ser
 * a empresa de faturamento -- decisão documentada em
 * `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md` (17/08),
 * com colunas `nome_empresa`, `cnpj` e `cost_center_id` dedicadas a isso.
 *
 * O rótulo "Área" é medida temporária e honesta, não decisão de arquitetura:
 * medido no banco, `nome_empresa` está preenchido nos 11 clusters, mas com
 * NOME DE MENTIRA do gerador de dado de semente (TAX = "Cerrado Logística
 * S.A.", OSG = "Ouro Verde Transportes Ltda"...) -- e `estrutura_clusters`
 * não tem coluna `ambiente`, então isso vale em produção também, não só em
 * dev. `cnpj` só tem 2 de 11 preenchidos, de origem igualmente suspeita. A
 * tela não pode dizer "Empresa" sem mentir enquanto isso não for cadastrado
 * de verdade -- é tarefa de cadastro, não de código.
 *
 * O caminho de volta para "Empresa" já está no banco, não precisa ser
 * inventado: `estrutura_areas` tem `cluster_id` (10/10 linhas) e
 * `cost_center_id` (9/10) preenchidos -- a ponte cluster↔centro-de-custo
 * existe e está quase completa, só nenhuma query do board passa por ela.
 * Três clusters já têm o vínculo direto certo: TAX → PSA CONSULTORES,
 * OSG → PSA CONSULTORIA EMPRESARIAL, Adm & Fin → PRADO SUZUKI. Preencher os
 * outros 8 destrava a dimensão empresa de verdade.
 *
 * Diferença deliberada para o OSG Work: lá, ficar sem cliente BLOQUEIA as
 * ferramentas, e a barra pulsa para cobrar a escolha. Aqui, "Todas as áreas"
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
          Área
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
            <SelectValue placeholder={isLoading ? 'Carregando…' : 'Todas as áreas'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as áreas</SelectItem>
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
          ? 'Visão do grupo inteiro — escolha uma área para recortar a página'
          : <>Filtrando por: <strong style={{ color: 'var(--board-v4-ink)' }}>{selecionado?.nome ?? '—'}</strong></>}
      </div>
    </div>
  );
};
