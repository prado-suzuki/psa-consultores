import { describe, expect, it } from 'vitest';
import type { OsRow } from '@/lib/dashboardClientesOs/types';
import { carteiraClientes, clientesCicloVencido, tempoMedioAditivo } from './boardCarteira';

const os = (over: Partial<OsRow> & Pick<OsRow, 'os_id' | 'cliente_id'>): OsRow => ({
  numero_os: null,
  cliente_nome: `Cliente ${over.cliente_id}`,
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  servico_id: null,
  servico_nome: null,
  data_emissao: null,
  data_inicio: '2026-01-15',
  data_fim: null,
  situacao: 'em_andamento',
  situacao_label: 'Em andamento',
  status_contrato: 'Vigente',
  faturamento: 100_000,
  ...over,
});

describe('carteiraClientes', () => {
  it('soma gasto, conta renovação e o intervalo entre OS', () => {
    const rows = [
      os({ os_id: '1', cliente_id: 'a', cliente_nome: 'Alfa', data_inicio: '2025-01-01', faturamento: 200_000 }),
      os({ os_id: '2', cliente_id: 'a', cliente_nome: 'Alfa', data_inicio: '2025-04-01', faturamento: 100_000 }),
      os({ os_id: '3', cliente_id: 'b', cliente_nome: 'Beta', data_inicio: '2026-01-01', faturamento: 50_000 }),
    ];
    const c = carteiraClientes(rows, '2025-07-01');
    expect(c[0]).toMatchObject({ cliente_id: 'a', gasto: 300_000, os: 2, renovacoes: 1, ultimaOs: '2025-04-01' });
    expect(c[0].diasMedioAditivo).toBe(90);
    expect(c[0].diasDesdeUltima).toBe(91);
    expect(c[1].renovacoes).toBe(0);
    expect(c[1].diasMedioAditivo).toBeNull();
    expect(tempoMedioAditivo(rows)).toBe(90);
    expect(clientesCicloVencido(c).map((x) => x.cliente_id)).toEqual(['a']);
  });
});
