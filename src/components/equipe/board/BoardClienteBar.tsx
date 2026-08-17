import { Building2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClusters } from '@/hooks/useClusters';
import { useBoardCluster } from '@/hooks/useBoardCluster';

/**
 * Rotas do Board que HONRAM o cliente global.
 *
 * A barra só aparece nestas. Um seletor visível numa tela que o ignora é pior
 * que seletor nenhum: o sócio filtra, o número não muda, e ele passa a
 * desconfiar de todos os números da área. Página nova entra nesta lista no
 * mesmo commit em que passa a consumir `useBoardCluster`.
 */
export const ROTAS_COM_CLIENTE_GLOBAL: string[] = [
  '/equipe/board/dashboard',
];

export const honraClienteGlobal = (pathname: string): boolean =>
  ROTAS_COM_CLIENTE_GLOBAL.includes(pathname);

/** Radix rejeita `value=""` em SelectItem — "todos" precisa de um sentinela. */
const TODOS = '__todos__';

/**
 * Faixa de seleção de cliente da área Board.
 *
 * Diferença deliberada para o OSG Work: lá, ficar sem cliente BLOQUEIA as
 * ferramentas, e a barra pulsa para cobrar a escolha. Aqui, "Todos os clientes"
 * é o estado normal e desejado do sócio — a visão da empresa inteira. Alarme
 * sobre o estado padrão seria gritar lobo.
 */
export const BoardClienteBar = () => {
  const { cluster, setCluster } = useBoardCluster();
  const { data: clusters = [], isLoading } = useClusters();

  const ativos = clusters.filter((c) => c.ativo);
  const inativos = clusters.filter((c) => !c.ativo);
  const selecionado = clusters.find((c) => c.id === cluster);
  const todos = !cluster;

  return (
    <div
      className="px-6 py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
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
          Cliente
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
            <SelectValue placeholder={isLoading ? 'Carregando…' : 'Todos os clientes'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os clientes</SelectItem>
            {ativos.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
            {/* Inativos no fim: continuam filtráveis para olhar histórico. */}
            {inativos.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} (inativo)</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-[11.5px] truncate" style={{ color: 'var(--board-v4-ink3)' }}>
        {todos
          ? 'Visão da empresa inteira — escolha um cliente para recortar a página'
          : <>Filtrando por: <strong style={{ color: 'var(--board-v4-ink)' }}>{selecionado?.nome ?? '—'}</strong></>}
      </div>
    </div>
  );
};
