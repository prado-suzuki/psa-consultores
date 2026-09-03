/**
 * Cliente, ano e mês — o recorte que falta em todo menu da diretoria.
 * Vive na URL (`boardCliente` / `boardAno` / `boardMes`) junto do cluster.
 */
import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBoardCluster } from '@/hooks/useBoardCluster';
import { useDashboardAmbiente } from '@/lib/dashboardAmbiente';
import { useDashboardClientesOs } from '@/hooks/useDashboardClientesOs';
import { filtrarPorCluster } from '@/lib/boardExecutivo';
import { filtrarLegado } from '@/lib/boardLegado';
import { MESES_RECORTE, anosDisponiveis } from '@/lib/boardRecorte';

const TODOS = '__todos__';

export const BoardRecorteBar = () => {
  const { cluster, cliente, setCliente, ano, setAno, mes, setMes } = useBoardCluster();
  const { ambiente } = useDashboardAmbiente();
  const negocio = useDashboardClientesOs(ambiente);

  const clientes = useMemo(() => {
    const rows = filtrarLegado(filtrarPorCluster(negocio.data?.clienteRows ?? [], cluster));
    return [...rows].sort((a, b) => a.cliente_nome.localeCompare(b.cliente_nome, 'pt-BR'));
  }, [negocio.data, cluster]);

  const anos = useMemo(
    () => anosDisponiveis(filtrarPorCluster(negocio.data?.osRows ?? [], cluster), negocio.hoje),
    [negocio.data, cluster, negocio.hoje],
  );

  const trigger = {
    backgroundColor: 'var(--bd-surface)',
    borderColor: (cliente || ano || mes) ? 'var(--bd-accent)' : 'var(--bd-line)',
  };

  return (
    <>
      <Select
        value={cliente || TODOS}
        onValueChange={(v) => setCliente(v === TODOS ? '' : v)}
        disabled={negocio.isLoading}
      >
        <SelectTrigger className="h-8 w-[176px] rounded-md text-[12.5px] font-medium" style={trigger}>
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os clientes</SelectItem>
          {clientes.map((c) => (
            <SelectItem key={c.cliente_id} value={c.cliente_id}>{c.cliente_nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={ano || TODOS} onValueChange={(v) => setAno(v === TODOS ? '' : v)}>
        <SelectTrigger className="h-8 w-[108px] rounded-md text-[12.5px] font-medium" style={trigger}>
          <SelectValue placeholder="Ano" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os anos</SelectItem>
          {anos.map((a) => (
            <SelectItem key={a} value={a}>{a}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mes || TODOS} onValueChange={(v) => setMes(v === TODOS ? '' : v)}>
        <SelectTrigger className="h-8 w-[128px] rounded-md text-[12.5px] font-medium" style={trigger}>
          <SelectValue placeholder="Mês" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos os meses</SelectItem>
          {MESES_RECORTE.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
};
