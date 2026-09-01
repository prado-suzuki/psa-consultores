import { describe, it, expect } from 'vitest';
import {
  mixProjetosAtivos,
  receitaDiretoria,
  capacidadeMelhorias,
  saudeOsg,
  HORAS_MES_FTE,
} from './boardDiretoria';
import { ehCadastroLegado, semCadastroLegado } from './boardLegado';
import type { OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';

const os = (p: Partial<OsRow> & { os_id: string; cliente_id: string }): OsRow => ({
  numero_os: null,
  cliente_nome: 'Cliente',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'cl1',
  cluster_nome: 'TAX',
  servico_id: null,
  servico_nome: null,
  data_emissao: null,
  data_inicio: null,
  data_fim: null,
  situacao: 'em andamento',
  situacao_label: 'Em andamento',
  status_contrato: 'Vigente',
  faturamento: 0,
  ...p,
});

const proj = (p: Partial<ProjetoRow> & { projeto_id: string }): ProjetoRow => ({
  projeto_nome: 'P',
  status_projeto: 'active',
  status_projeto_label: 'Ativo',
  cliente_id: 'c1',
  cliente_nome: 'Cliente',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'cl1',
  cluster_nome: 'TAX',
  area_nome: null,
  equipe_nome: null,
  responsavel_nome: null,
  os_id: null,
  numero_os: null,
  situacao_os: null,
  situacao_os_label: '',
  os_data_fim: null,
  valor_os: 0,
  horas_estimadas: 0,
  horas_realizadas: 0,
  desvio_pct: null,
  ...p,
});

describe('mixProjetosAtivos', () => {
  const linhasOs = [
    os({ os_id: 'o1', cliente_id: 'c1', data_inicio: '2026-08-20' }), // 1ª do c1 → novo
    os({ os_id: 'o2', cliente_id: 'c1', data_inicio: '2026-08-25' }), // aditivo
    os({ os_id: 'o3', cliente_id: 'c2', data_inicio: '2026-07-10' }), // janela anterior
    os({ os_id: 'o4', cliente_id: 'c3', data_inicio: null }),
  ];
  const projetos = [
    proj({ projeto_id: 'p1', os_id: 'o1' }),
    proj({ projeto_id: 'p2', os_id: 'o2' }),
    proj({ projeto_id: 'p3', os_id: 'o3' }),
    proj({ projeto_id: 'p4', os_id: 'o4' }),
    proj({ projeto_id: 'p5', os_id: null }),
    proj({ projeto_id: 'p6', os_id: 'o1', status_projeto: 'completed' }),
  ];

  it('separa cliente novo de aditivo pela primeira OS do cliente', () => {
    const m = mixProjetosAtivos({ projetos, os: linhasOs, hoje: '2026-08-28', dias: 30 });
    expect(m.clienteNovo).toBe(1);
    expect(m.aditivo).toBe(1);
    expect(m.iniciadosJanela).toBe(2);
  });

  it('compara com a janela anterior e ignora projeto nao ativo', () => {
    const m = mixProjetosAtivos({ projetos, os: linhasOs, hoje: '2026-08-28', dias: 30 });
    expect(m.ativos).toBe(5);
    expect(m.iniciadosJanelaAnterior).toBe(1);
    expect(m.variacaoPct).toBe(100);
  });

  it('sem base anterior a variacao e null, nao 0% nem 100%', () => {
    const m = mixProjetosAtivos({
      projetos: [proj({ projeto_id: 'p1', os_id: 'o1' })],
      os: [linhasOs[0]],
      hoje: '2026-08-28',
      dias: 30,
    });
    expect(m.variacaoPct).toBeNull();
  });

  it('projeto sem OS ou sem data nao vira aditivo por descarte', () => {
    const m = mixProjetosAtivos({ projetos, os: linhasOs, hoje: '2026-08-28', dias: 30 });
    expect(m.semClassificacao).toBe(2);
    expect(m.planejadaPaga).toBeNull();
    expect(m.motivos.planejadaPaga).toMatch(/sem campo/);
  });
});

describe('receitaDiretoria', () => {
  const linhas = [
    os({ os_id: 'o1', cliente_id: 'c1', faturamento: 100_000, data_fim: '2026-12-31' }),
    os({ os_id: 'o2', cliente_id: 'c2', faturamento: 50_000, data_fim: '2026-03-31' }),
    os({ os_id: 'o3', cliente_id: 'c3', faturamento: 0, data_fim: null }),
  ];

  it('ticket medio ignora OS sem valor lancado', () => {
    const r = receitaDiretoria(linhas, '2026-08-28');
    expect(r.ticketMedio).toBe(75_000);
    expect(r.osSemValor).toBe(1);
  });

  it('horizonte de caixa vem da OS vigente mais longa', () => {
    const r = receitaDiretoria(linhas, '2026-08-28');
    expect(r.projetosGerandoCaixa).toBe(1);
    expect(r.horizonteCaixa).toBe('2026-12');
    expect(r.caixaContratadoAFrente).toBe(100_000);
  });

  it('folha nao existe no cadastro: null com motivo, nunca zero', () => {
    const r = receitaDiretoria(linhas, '2026-08-28');
    expect(r.folhaMensal).toBeNull();
    expect(r.coberturaFolhaPct).toBeNull();
    expect(r.motivos.folha).toMatch(/folha/);
  });

  it('sem nenhuma OS com valor, ticket medio e null', () => {
    expect(receitaDiretoria([linhas[2]], '2026-08-28').ticketMedio).toBeNull();
  });
});

describe('capacidadeMelhorias', () => {
  it('converte horas em FTE pela regua de 176h/mes', () => {
    const c = capacidadeMelhorias([
      { id: 'm1', time_saved_hours: 176, cost_saved_monthly: 10_000 },
      { id: 'm2', time_saved_hours: 88, cost_saved_monthly: null },
    ]);
    expect(c.horasReduzidasMes).toBe(264);
    expect(c.fteLiberado).toBeCloseTo(264 / HORAS_MES_FTE);
    expect(c.economiaAnual).toBe(120_000);
  });

  it('ninguem preencheu horas: null, e nao 0 FTE', () => {
    const c = capacidadeMelhorias([{ id: 'm1', time_saved_hours: null, cost_saved_monthly: 500 }]);
    expect(c.horasReduzidasMes).toBeNull();
    expect(c.fteLiberado).toBeNull();
  });

  it('interno x cliente segue sem campo — nao inventa a divisao', () => {
    const c = capacidadeMelhorias([]);
    expect(c.ganhoInterno).toBeNull();
    expect(c.ganhoCliente).toBeNull();
    expect(c.motivos.distincao).toMatch(/process_improvements/);
  });
});

describe('saudeOsg', () => {
  const linhas = [
    os({ os_id: 'o1', cliente_id: 'c1', data_inicio: '2026-02-01', faturamento: 200_000 }),
    os({ os_id: 'o2', cliente_id: 'c2', data_inicio: '2026-05-01', faturamento: 100_000 }),
    os({ os_id: 'o3', cliente_id: 'c3', data_inicio: '2025-05-01', faturamento: 150_000 }),
  ];

  it('captacao do ano conta cliente pela primeira OS', () => {
    const s = saudeOsg({ os: linhas, melhorias: [], headcount: 10, hoje: '2026-08-28' });
    expect(s.captadosAno).toBe(2);
    expect(s.captadosAnoAnterior).toBe(1);
    expect(s.metaClientesAno).toBe(30);
  });

  it('compara receita do ano com o ano anterior', () => {
    const s = saudeOsg({ os: linhas, melhorias: [], headcount: 10, hoje: '2026-08-28' });
    expect(s.receitaAno).toBe(300_000);
    expect(s.receitaAnoAnterior).toBe(150_000);
    expect(s.variacaoReceitaPct).toBe(100);
  });

  it('senioridade e folha continuam sem cadastro', () => {
    const s = saudeOsg({ os: linhas, melhorias: [], headcount: null, hoje: '2026-08-28' });
    expect(s.headcount).toBeNull();
    expect(s.senioresJson).toBeNull();
    expect(s.folhaMensal).toBeNull();
  });
});

describe('cadastros legados', () => {
  it('reconhece as grafias do legado combinadas na reuniao', () => {
    expect(ehCadastroLegado('PSA CONSULTORES')).toBe(true);
    expect(ehCadastroLegado('Psa Consultores - Filial')).toBe(true);
    expect(ehCadastroLegado('PRADO SUZUKI')).toBe(true);
    expect(ehCadastroLegado('PradoSuzuki Empresas Familiares')).toBe(true);
    expect(ehCadastroLegado('P Consultores')).toBe(true);
  });

  it('nao derruba a estrutura viva de nome parecido', () => {
    expect(ehCadastroLegado('PSA Auditores')).toBe(false);
    expect(ehCadastroLegado('PSA Norte')).toBe(false);
    expect(ehCadastroLegado('Prado Advogados')).toBe(false);
  });

  it('filtra a colecao pelo nome informado', () => {
    const linhas = [{ nome: 'Alfa' }, { nome: 'Psa Consultores' }];
    expect(semCadastroLegado(linhas, (l) => l.nome)).toEqual([{ nome: 'Alfa' }]);
  });
});
