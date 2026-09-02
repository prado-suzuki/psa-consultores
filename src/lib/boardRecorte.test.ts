import { describe, expect, it } from 'vitest';
import type { ClienteRow, OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';
import {
  anosDisponiveis, aplicarRecorteClientes, aplicarRecorteMelhorias, aplicarRecorteOs,
  aplicarRecorteProjetos, dataNaJanela, hojeDoRecorte,
} from './boardRecorte';

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
  data_inicio: '2026-03-10',
  data_fim: null,
  situacao: 'em_andamento',
  situacao_label: 'Em andamento',
  status_contrato: 'Vigente',
  faturamento: 10,
  ...over,
});

const cliente = (id: string): ClienteRow => ({
  cliente_id: id,
  cliente_nome: `Cliente ${id}`,
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  setor: null,
  uf: 'SP',
  regiao: null,
  ativo: true,
  data_cadastro: '2025-01-01',
  faturamento_total: 0,
  ticket_medio: null,
  qtd_os_ativas: 0,
  qtd_contratos_vigentes: 0,
  qtd_contratos_vencidos: 0,
  qtd_contratos_30d: 0,
});

const projeto = (over: Partial<ProjetoRow> & Pick<ProjetoRow, 'projeto_id'>): ProjetoRow => ({
  projeto_nome: 'P',
  status_projeto: 'active',
  status_projeto_label: 'Ativo',
  cliente_id: 'a',
  cliente_nome: 'A',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  area_nome: null,
  equipe_nome: null,
  responsavel_nome: null,
  os_id: '1',
  numero_os: null,
  situacao_os: null,
  situacao_os_label: '',
  os_data_fim: null,
  valor_os: 0,
  horas_estimadas: 0,
  horas_realizadas: 0,
  desvio_pct: null,
  ...over,
});

describe('boardRecorte', () => {
  it('dataNaJanela aceita ano, mês ou os dois; sem data some no período', () => {
    expect(dataNaJanela('2026-03-10', '', '')).toBe(true);
    expect(dataNaJanela('2026-03-10', '2026', '')).toBe(true);
    expect(dataNaJanela('2026-03-10', '2026', '03')).toBe(true);
    expect(dataNaJanela('2026-03-10', '2025', '')).toBe(false);
    expect(dataNaJanela('2026-03-10', '2026', '04')).toBe(false);
    expect(dataNaJanela(null, '2026', '')).toBe(false);
  });

  it('hojeDoRecorte usa o último dia do mês ou o fim do ano escolhido', () => {
    expect(hojeDoRecorte('2026-09-01', { ano: '', mes: '' })).toBe('2026-09-01');
    expect(hojeDoRecorte('2026-09-01', { ano: '2026', mes: '' })).toBe('2026-09-01');
    expect(hojeDoRecorte('2026-09-01', { ano: '2025', mes: '' })).toBe('2025-12-31');
    expect(hojeDoRecorte('2026-09-01', { ano: '2026', mes: '02' })).toBe('2026-02-28');
  });

  it('recorta OS por cliente e período; data_emissao vale sem data_inicio', () => {
    const rows = [
      os({ os_id: '1', cliente_id: 'a', data_inicio: '2026-03-10' }),
      os({ os_id: '2', cliente_id: 'b', data_inicio: '2026-03-10' }),
      os({ os_id: '3', cliente_id: 'a', data_inicio: null, data_emissao: '2025-11-01' }),
    ];
    expect(aplicarRecorteOs(rows, { cliente: 'a', ano: '', mes: '' }).map((o) => o.os_id)).toEqual(['1', '3']);
    expect(aplicarRecorteOs(rows, { cliente: '', ano: '2026', mes: '03' }).map((o) => o.os_id)).toEqual(['1', '2']);
  });

  it('clientes no período são os que têm OS recortada', () => {
    const clientes = [cliente('a'), cliente('b'), cliente('c')];
    const recortadas = [os({ os_id: '1', cliente_id: 'a' })];
    expect(aplicarRecorteClientes(clientes, recortadas, { cliente: '', ano: '2026', mes: '' }).map((c) => c.cliente_id)).toEqual(['a']);
    expect(aplicarRecorteClientes(clientes, recortadas, { cliente: 'b', ano: '', mes: '' }).map((c) => c.cliente_id)).toEqual(['b']);
  });

  it('projeto sem OS some quando há período; cliente recorta direto', () => {
    const projetos = [
      projeto({ projeto_id: 'p1', os_id: '1', cliente_id: 'a' }),
      projeto({ projeto_id: 'p2', os_id: null, cliente_id: 'a' }),
    ];
    const recortadas = [os({ os_id: '1', cliente_id: 'a' })];
    expect(aplicarRecorteProjetos(projetos, recortadas, { cliente: '', ano: '2026', mes: '' }).map((p) => p.projeto_id)).toEqual(['p1']);
    expect(aplicarRecorteProjetos(projetos, recortadas, { cliente: 'b', ano: '', mes: '' })).toEqual([]);
  });

  it('melhoria segue created_at e o cluster do cliente escolhido', () => {
    const rows = [
      { id: 'm1', cluster_id: 'c1', created_at: '2026-04-01', cost_saved_monthly: null, implementation_cost: null, one_time_external_cost: null },
      { id: 'm2', cluster_id: 'c2', created_at: '2026-04-01', cost_saved_monthly: null, implementation_cost: null, one_time_external_cost: null },
    ];
    expect(aplicarRecorteMelhorias(rows, { cliente: 'a', ano: '2026', mes: '' }, 'c1').map((m) => m.id)).toEqual(['m1']);
    expect(aplicarRecorteMelhorias(rows, { cliente: 'a', ano: '', mes: '' }, null)).toEqual([]);
  });

  it('anosDisponiveis inclui o ano de hoje e os das OS', () => {
    expect(anosDisponiveis([os({ os_id: '1', cliente_id: 'a', data_inicio: '2024-01-01' })], '2026-09-01')).toEqual(['2026', '2024']);
  });
});
