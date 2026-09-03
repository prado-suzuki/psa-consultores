import { describe, expect, it } from 'vitest';
import type { ClienteRow, OsRow } from '@/lib/dashboardClientesOs/types';
import {
  SEM_REGIAO, SEM_SERVICO, cruzamentoRegiaoServico, distribuicaoRegiao,
  chaveRegiao, chaveServico, ePracaNacional, lacunasAditivo, ocorrenciaServicos,
} from './boardOportunidade';

const cliente = (over: Partial<ClienteRow> & Pick<ClienteRow, 'cliente_id'>): ClienteRow => ({
  cliente_nome: `Cliente ${over.cliente_id}`,
  cluster_id: 'c1',
  cluster_nome: 'Cluster',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  setor: null,
  uf: null,
  regiao: null,
  ativo: true,
  data_cadastro: '2025-01-01T00:00:00Z',
  faturamento_total: 0,
  ticket_medio: null,
  qtd_os_ativas: 0,
  qtd_contratos_vigentes: 0,
  qtd_contratos_vencidos: 0,
  qtd_contratos_30d: 0,
  ...over,
});

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

describe('chaveRegiao / chaveServico', () => {
  it('UF válida vence região livre', () => {
    expect(chaveRegiao(cliente({ cliente_id: 'a', uf: 'mt', regiao: '3SU' }))).toBe('MT');
  });

  it('sem UF usa a região cadastrada; os dois vazios não somem', () => {
    expect(chaveRegiao(cliente({ cliente_id: 'a', regiao: 'Norte' }))).toBe('reg:Norte');
    expect(chaveRegiao(cliente({ cliente_id: 'a' }))).toBe(SEM_REGIAO);
  });

  it('normaliza UF escrita por extenso e recusa BRA como praça', () => {
    expect(chaveRegiao(cliente({ cliente_id: 'a', uf: 'MATO GROSSO', regiao: 'BRA' }))).toBe('MT');
    expect(chaveRegiao(cliente({ cliente_id: 'a', uf: 'Paraná' }))).toBe('PR');
    expect(chaveRegiao(cliente({ cliente_id: 'a', regiao: 'BRA' }))).toBe(SEM_REGIAO);
    expect(ePracaNacional('brasil')).toBe(true);
    expect(ePracaNacional('3NO')).toBe(false);
  });

  it('serviço sem id nem nome fica visível como sem_servico', () => {
    expect(chaveServico(os({ os_id: '1', cliente_id: 'a' }))).toBe(SEM_SERVICO);
  });
});

describe('distribuicaoRegiao / ocorrenciaServicos', () => {
  it('agrupa clientes por UF e calcula ticket da praça', () => {
    const clientes = [
      cliente({ cliente_id: 'a', uf: 'MT' }),
      cliente({ cliente_id: 'b', uf: 'MT' }),
      cliente({ cliente_id: 'c', uf: 'SP', ativo: false }),
    ];
    const rows = [
      os({ os_id: '1', cliente_id: 'a', faturamento: 200_000 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 100_000 }),
    ];
    const d = distribuicaoRegiao(clientes, rows);
    expect(d[0]).toMatchObject({ chave: 'MT', clientes: 2, ativos: 2, os: 2 });
    expect(d[0].ticket).toBe(150_000);
    expect(d.find((x) => x.chave === 'SP')?.ativos).toBe(0);
  });

  it('serviço conta clientes distintos, não OS repetida', () => {
    const rows = [
      os({ os_id: '1', cliente_id: 'a', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '2', cliente_id: 'a', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '3', cliente_id: 'b', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '4', cliente_id: 'c', servico_id: 's2', servico_nome: 'ITR' }),
    ];
    const s = ocorrenciaServicos(rows);
    expect(s[0]).toMatchObject({ rotulo: 'ITCMD', os: 3, clientes: 2 });
    expect(s[1]).toMatchObject({ rotulo: 'ITR', clientes: 1 });
  });
});

describe('lacunasAditivo', () => {
  it('aponta quem na praça ainda não tem o serviço comum', () => {
    const clientes = [
      cliente({ cliente_id: 'a', uf: 'MT', cliente_nome: 'Alfa' }),
      cliente({ cliente_id: 'b', uf: 'MT', cliente_nome: 'Beta' }),
      cliente({ cliente_id: 'c', uf: 'MT', cliente_nome: 'Gama' }),
    ];
    const rows = [
      os({ os_id: '1', cliente_id: 'a', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '2', cliente_id: 'b', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '3', cliente_id: 'c', servico_id: 's2', servico_nome: 'ITR' }),
    ];
    const cruz = cruzamentoRegiaoServico(clientes, rows);
    expect(cruz.find((x) => x.servico === 's1')?.share).toBeCloseTo(2 / 3);

    const lacunas = lacunasAditivo(clientes, rows, { minClientesRegiao: 3, minShare: 0.5 });
    expect(lacunas).toHaveLength(1);
    expect(lacunas[0]).toMatchObject({
      cliente_id: 'c',
      rotuloServico: 'ITCMD',
      rotuloRegiao: 'Mato Grosso',
    });
  });

  it('clientes só em BRA não viram pares nacionais', () => {
    const clientes = [
      cliente({ cliente_id: 'a', regiao: 'BRA', cliente_nome: 'Alfa' }),
      cliente({ cliente_id: 'b', regiao: 'BRA', cliente_nome: 'Beta' }),
      cliente({ cliente_id: 'c', regiao: 'BRA', cliente_nome: 'Gama' }),
    ];
    const rows = [
      os({ os_id: '1', cliente_id: 'a', servico_id: 's1', servico_nome: 'ITCMD' }),
      os({ os_id: '2', cliente_id: 'b', servico_id: 's1', servico_nome: 'ITCMD' }),
    ];
    expect(lacunasAditivo(clientes, rows, { minClientesRegiao: 3, minShare: 0.3 })).toEqual([]);
  });

  it('praça pequena demais não inventa oportunidade', () => {
    const clientes = [
      cliente({ cliente_id: 'a', uf: 'MT' }),
      cliente({ cliente_id: 'b', uf: 'SP' }),
    ];
    const rows = [os({ os_id: '1', cliente_id: 'a', servico_id: 's1', servico_nome: 'ITCMD' })];
    expect(lacunasAditivo(clientes, rows, { minClientesRegiao: 3, minShare: 0.3 })).toEqual([]);
  });

  it('lacuna usa produto quando a OS não tem serviço', () => {
    const clientes = [
      cliente({ cliente_id: 'a', uf: 'MT', cliente_nome: 'Alfa' }),
      cliente({ cliente_id: 'b', uf: 'MT', cliente_nome: 'Beta' }),
      cliente({ cliente_id: 'c', uf: 'MT', cliente_nome: 'Gama' }),
    ];
    const rows = [
      os({ os_id: '1', cliente_id: 'a' }),
      os({ os_id: '2', cliente_id: 'b' }),
      os({ os_id: '3', cliente_id: 'c' }),
    ];
    const produtos = new Map([
      ['1', [{ id: 'p1', label: 'Planejamento Sucessório', percentual: 100 }]],
      ['2', [{ id: 'p1', label: 'Planejamento Sucessório', percentual: 100 }]],
    ]);
    const lacunas = lacunasAditivo(clientes, rows, {
      minClientesRegiao: 3, minShare: 0.5, produtosPorOs: produtos,
    });
    expect(lacunas).toHaveLength(1);
    expect(lacunas[0]).toMatchObject({
      cliente_id: 'c',
      rotuloServico: 'Planejamento Sucessório',
    });
  });

  it('sem serviço na OS, o produto contratado vira a oferta', () => {
    const rows = [
      os({ os_id: '1', cliente_id: 'a', faturamento: 100 }),
      os({ os_id: '2', cliente_id: 'b', faturamento: 50 }),
    ];
    const produtos = new Map([
      ['1', [{ id: 'p1', label: 'ITCMD', percentual: 100 }]],
      ['2', [{ id: 'p1', label: 'ITCMD', percentual: 100 }]],
    ]);
    const s = ocorrenciaServicos(rows, produtos);
    expect(s[0]).toMatchObject({ chave: 'prod:p1', rotulo: 'ITCMD', clientes: 2, os: 2 });
  });

  it('serviço sem nome não vira produto para vender', () => {
    const clientes = [
      cliente({ cliente_id: 'a', uf: 'MT' }),
      cliente({ cliente_id: 'b', uf: 'MT' }),
      cliente({ cliente_id: 'c', uf: 'MT' }),
    ];
    const rows = [
      os({ os_id: '1', cliente_id: 'a' }),
      os({ os_id: '2', cliente_id: 'b' }),
    ];
    expect(lacunasAditivo(clientes, rows, { minClientesRegiao: 3, minShare: 0.3 })).toEqual([]);
  });
});
