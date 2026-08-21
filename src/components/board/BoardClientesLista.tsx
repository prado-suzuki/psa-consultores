import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ClientesFilterBar, { type ClientesFilterField } from '@/components/equipe/clientes/ClientesFilterBar';
import { useClientesFiltrados, useOsExpand } from '@/hooks/useGestaoClientes';
import { isoToMasked, formatCurrencyDisplay } from '@/components/equipe/client-form/constants';

/**
 * Lista enxuta de clientes do Board (reunião Mariana, 17/08 -- P8).
 *
 * Substitui, SÓ AQUI, a tabela de cadastro completo (`GestaoClientesContent`)
 * que a página montava antes: aquela tabela é o módulo de cadastro em si
 * (criar/editar/excluir OS, contribuintes...), compartilhado com a Gerencial
 * da Tax e da OSG, e não é estratégica para quem olha o Board. O componente
 * de cadastro não foi tocado -- continua servindo Tax/OSG do jeito que
 * sempre serviu; esta tela simplesmente parou de montá-lo.
 *
 * Nome + status por linha; clicar abre um cartão com os 6 campos que a
 * reunião pediu. "Projetos ativos", "valor total" e "término do contrato"
 * vêm das OS do cliente (`useOsExpand`, sob demanda, só quando o cartão
 * abre) -- não existe consulta prévia somando isso para todo mundo.
 */
export const BoardClientesLista = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(null);

  const { data: resultados = [], isLoading } = useClientesFiltrados(
    { clienteId: '', status, tipo, categoria, nomeRazaoSocial: '' },
    true,
  );

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resultados;
    return resultados.filter((c) => (c.nome ?? '').toLowerCase().includes(q));
  }, [resultados, search]);

  const setFilter = (field: ClientesFilterField, val: string) => {
    switch (field) {
      case 'search': setSearch(val); break;
      case 'status': setStatus(val); break;
      case 'tipo': setTipo(val); break;
      case 'categoria': setCategoria(val); break;
    }
  };
  const handleClear = () => {
    setSearch(''); setStatus(''); setTipo(''); setCategoria('');
  };

  return (
    <div className="space-y-3">
      <ClientesFilterBar
        value={{ search, status, tipo, categoria }}
        onChange={setFilter}
        onClear={handleClear}
        resultCount={filtrados.length}
      />

      <div className="board-card p-2">
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--board-indigo)' }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: 'var(--board-t3)' }}>
            Nenhum cliente encontrado.
          </div>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--board-border-s)' }}>
            {filtrados.map((c) => (
              <li key={c.id}>
                <Popover open={abertoId === c.id} onOpenChange={(o) => setAbertoId(o ? c.id : null)}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[var(--board-border-s)]"
                    >
                      <span className="truncate text-[13px]" style={{ color: 'var(--board-t1)' }}>
                        {c.nome || '—'}
                      </span>
                      <span
                        className="flex shrink-0 items-center gap-1.5 text-[11.5px]"
                        style={{ color: c.ativo ? 'var(--board-t2)' : 'var(--board-t4)' }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: c.ativo ? 'var(--board-green)' : 'var(--board-t4)' }}
                        />
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72">
                    <CardCliente
                      clienteId={c.id}
                      nome={c.nome || '—'}
                      ativo={c.ativo}
                      createdAt={(c.created_at as string | null | undefined) ?? null}
                    />
                  </PopoverContent>
                </Popover>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const Linha = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="flex items-center justify-between gap-2">
    <dt style={{ color: 'var(--board-t3)' }}>{rotulo}</dt>
    <dd className="font-medium" style={{ color: 'var(--board-t1)' }}>{valor}</dd>
  </div>
);

const CardCliente = ({
  clienteId,
  nome,
  ativo,
  createdAt,
}: {
  clienteId: string;
  nome: string;
  ativo: boolean | null;
  createdAt: string | null;
}) => {
  const { data: os, isLoading } = useOsExpand(clienteId);
  const projetosAtivos = (os ?? []).filter((o) => o.situacao === 'em_andamento').length;
  const valorTotal = (os ?? []).reduce((soma, o) => soma + (o.valor_projeto ?? 0), 0);
  const dataTermino = (os ?? [])
    .map((o) => o.data_fim)
    .filter((d): d is string => !!d)
    .sort()
    .at(-1) ?? null;

  return (
    <div className="space-y-2 text-[12px]">
      <p className="text-[13px] font-semibold" style={{ color: 'var(--board-t1)' }}>{nome}</p>
      {isLoading ? (
        <p style={{ color: 'var(--board-t3)' }}>Carregando…</p>
      ) : (
        <dl className="space-y-1.5">
          <Linha rotulo="Status" valor={ativo ? 'Ativo' : 'Inativo'} />
          <Linha rotulo="Cliente desde" valor={createdAt ? isoToMasked(createdAt) : '—'} />
          <Linha rotulo="Projetos ativos" valor={String(projetosAtivos)} />
          <Linha rotulo="Valor total" valor={formatCurrencyDisplay(valorTotal)} />
          <Linha rotulo="OS cadastradas" valor={String(os?.length ?? 0)} />
          <Linha rotulo="Término do contrato" valor={dataTermino ? isoToMasked(dataTermino) : '—'} />
        </dl>
      )}
    </div>
  );
};

export default BoardClientesLista;
