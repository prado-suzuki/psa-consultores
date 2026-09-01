import { describe, expect, it } from 'vitest';
import type { OsRow } from '@/lib/dashboardClientesOs/types';
import {
  addDaysIso, caixaVigente, classificarMix, fteDeHoras, mixAtivos,
  recorteOsg, saudeOsg, serieHorizonte, serieMixMensal, ticketMedioAno,
} from './boardDiretoria';

const os = (p: Partial<OsRow> & Pick<OsRow, 'os_id' | 'cliente_id'>): OsRow => ({
  numero_os: p.os_id,
  cliente_nome: p.cliente_id,
  tipo_cliente: 'Fixo',
  categoria: 'consultoria',
  cluster_id: 'c1',
  cluster_nome: p.cluster_nome ?? 'PSA Norte',
  servico_id: null,
  servico_nome: null,
  data_emissao: null,
  data_inicio: p.data_inicio ?? '2026-01-15',
  data_fim: p.data_fim ?? null,
  situacao: p.situacao ?? 'em_andamento',
  situacao_label: 'Em andamento',
  status_contrato: p.status_contrato ?? 'Vigente',
  faturamento: p.faturamento ?? 100_000,
  ...p,
});

describe('classificarMix', () => {
  const primeira = new Map([['a', '2025-03-01'], ['b', '2026-08-10']]);

  it('janela + primeira OS do cliente = cliente novo', () => {
    expect(classificarMix(os({ os_id: '1', cliente_id: 'b', data_inicio: '2026-08-10' }), primeira, '2026-08-01'))
      .toBe('cliente_novo');
  });

  it('janela + cliente já tinha OS = aditivo', () => {
    expect(classificarMix(os({ os_id: '2', cliente_id: 'a', data_inicio: '2026-08-12' }), primeira, '2026-08-01'))
      .toBe('aditivo');
  });

  it('iniciada antes da janela = já planejada', () => {
    expect(classificarMix(os({ os_id: '3', cliente_id: 'a', data_inicio: '2025-03-01' }), primeira, '2026-08-01'))
      .toBe('entrega_planejada');
  });

  it('sem data = inclassificável', () => {
    expect(classificarMix(os({ os_id: '4', cliente_id: 'a', data_inicio: null }), primeira, '2026-08-01'))
      .toBe('inclassificavel');
  });
});

describe('mixAtivos', () => {
  const hoje = '2026-08-31';
  const rows = [
    os({ os_id: '1', cliente_id: 'novo', data_inicio: '2026-08-10' }),
    os({ os_id: '2', cliente_id: 'velho', data_inicio: '2025-01-01' }),
    os({ os_id: '3', cliente_id: 'velho', data_inicio: '2026-08-15' }),
    os({ os_id: '4', cliente_id: 'saiu', data_inicio: '2026-07-01', situacao: 'concluido' }),
    os({ os_id: '5', cliente_id: 'antes', data_inicio: '2026-07-20' }),
  ];

  it('conta ativos e o delta das iniciadas 30d vs 30d anteriores', () => {
    const m = mixAtivos(rows, hoje, 30);
    expect(m.ativos).toBe(4);
    expect(m.fatias.cliente_novo).toBe(1);
    expect(m.fatias.aditivo).toBe(1);
    expect(m.fatias.entrega_planejada).toBe(2);
    expect(m.iniciadasJanela).toBe(2);
    expect(m.iniciadasAnterior).toBe(1);
    expect(m.delta).toBe(1);
  });
});

describe('ticketMedioAno / caixa / horizonte', () => {
  const hoje = '2026-08-31';
  const rows = [
    os({ os_id: '1', cliente_id: 'a', data_inicio: '2026-02-01', faturamento: 200_000, status_contrato: 'Vigente', data_fim: '2026-10-15' }),
    os({ os_id: '2', cliente_id: 'b', data_inicio: '2026-03-01', faturamento: 100_000, status_contrato: 'Vigente', data_fim: '2026-10-20' }),
    os({ os_id: '3', cliente_id: 'c', data_inicio: '2025-06-01', faturamento: 50_000, status_contrato: 'Vigente', data_fim: null }),
  ];

  it('ticket = receita do ano / clientes do ano', () => {
    expect(ticketMedioAno(rows, hoje)).toBe(150_000);
  });

  it('caixa vigente soma vigente + a vencer', () => {
    expect(caixaVigente(rows)).toBe(350_000);
  });

  it('horizonte agrupa por mês de fim e isola OS sem data_fim', () => {
    const h = serieHorizonte(rows, hoje, 4);
    expect(h.serie.find((p) => p.mes === '2026-10')?.valor).toBe(300_000);
    expect(h.semFim).toBe(1);
    expect(h.semFimValor).toBe(50_000);
  });
});

describe('OSG e FTE', () => {
  it('recorte OSG e projeção linear até dezembro', () => {
    const rows = [
      os({ os_id: '1', cliente_id: 'x', cluster_nome: 'OSG', data_inicio: '2026-02-01' }),
      os({ os_id: '2', cliente_id: 'y', cluster_nome: 'OSG', data_inicio: '2026-04-01' }),
      os({ os_id: '3', cliente_id: 'z', cluster_nome: 'PSA Norte', data_inicio: '2026-03-01' }),
    ];
    const s = saudeOsg(rows, '2026-08-31');
    expect(s.clientesAno).toBe(2);
    expect(s.meta).toBe(30);
    expect(s.projecaoAno).toBeCloseTo(3, 5);
    expect(recorteOsg(rows)).toHaveLength(2);
  });

  it('FTE = horas / 176; null continua null', () => {
    expect(fteDeHoras(352)).toEqual({ horas: 352, fte: 2 });
    expect(fteDeHoras(null)).toEqual({ horas: null, fte: null });
  });
});

describe('addDaysIso / serieMixMensal', () => {
  it('anda em UTC sem virar o dia', () => {
    expect(addDaysIso('2026-08-31', -30)).toBe('2026-08-01');
  });

  it('série mensal preenche os meses pedidos', () => {
    const s = serieMixMensal([
      os({ os_id: '1', cliente_id: 'a', data_inicio: '2026-08-10' }),
    ], '2026-08-31', 3);
    expect(s.map((p) => p.mes)).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(s[2].cliente_novo).toBe(1);
  });
});
