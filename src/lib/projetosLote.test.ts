import { describe, it, expect } from 'vitest';
import {
  buildLoteFormData,
  buildLoteProjectName,
  findProdutosJaCriados,
  validateLoteRow,
  type LoteCommon,
  type LoteProduto,
  type LoteRow,
} from './projetosLote';

const common: LoteCommon = {
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'active',
  description: 'Descrição da OS',
};

const baseRow: LoteRow = {
  produtoSegmentoId: 'cha',
  produtoLabel: 'CHA — Canal de Chamados',
  include: true,
  name: 'Cliente — OS 035/2026 — CHA — Canal de Chamados',
  equipeId: 'eq1',
  estruturaAreaId: 'area1',
  leaderIds: ['ricardo'],
  responsibleId: '',
  memberIds: ['m1', 'm2'],
  isMultidisciplinar: false,
  semExecutorFixo: false,
};

describe('validateLoteRow', () => {
  it('exige Responsável Executor no fluxo normal', () => {
    expect(validateLoteRow(baseRow, common))
      .toBe('CHA — Canal de Chamados: Selecione o Responsável Executor');
  });

  it('sem executor fixo: dispensa o Responsável Executor', () => {
    expect(validateLoteRow({ ...baseRow, semExecutorFixo: true }, common)).toBeNull();
  });

  it('sem executor fixo não dispensa líder nem membros', () => {
    const row = { ...baseRow, semExecutorFixo: true };
    expect(validateLoteRow({ ...row, leaderIds: [] }, common))
      .toBe('CHA — Canal de Chamados: Selecione ao menos um Líder Geral');
    expect(validateLoteRow({ ...row, memberIds: [] }, common))
      .toBe('CHA — Canal de Chamados: Selecione ao menos um Membro do Projeto');
  });
});

describe('findProdutosJaCriados', () => {
  const cliente = 'Agro Amazônia Produtos Agropecuários S.a.';
  const os = '035/2026';
  const produtos: LoteProduto[] = [
    { produtoSegmentoId: 'dc', produtoLabel: 'DC — Diagnóstico contábil' },
    { produtoSegmentoId: 'cha', produtoLabel: 'CHA — Canal de Chamados' },
    { produtoSegmentoId: 'af', produtoLabel: 'AF — Atendimento a fiscalizações' },
  ];

  it('OS sem projeto: nada marcado como já criado', () => {
    expect(findProdutosJaCriados([], cliente, os, produtos)).toEqual([]);
  });

  it('reconhece pelo nome padrão gerado', () => {
    const existentes = [{ name: buildLoteProjectName(cliente, os, 'CHA — Canal de Chamados') }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['cha']);
  });

  it('ignora diferença de caixa e espaço extra', () => {
    const existentes = [{ name: `  ${buildLoteProjectName(cliente, os, 'DC — Diagnóstico contábil').toUpperCase()}  ` }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['dc']);
  });

  it('reconhece projeto renomeado que ainda carrega o rótulo do produto', () => {
    const existentes = [{ name: 'Chamados 2026 — AF — Atendimento a fiscalizações (revisado)' }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['af']);
  });

  it('renomeado sem o rótulo escapa da detecção (limite conhecido)', () => {
    const existentes = [{ name: 'Projeto de chamados do Agro' }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual([]);
  });

  it('marca todos quando a OS inteira já foi criada', () => {
    const existentes = produtos.map(produto => ({ name: buildLoteProjectName(cliente, os, produto.produtoLabel) }));
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['dc', 'cha', 'af']);
  });
});

describe('buildLoteFormData', () => {
  it('sem executor fixo: envia responsible_id vazio mesmo se algo tinha sido escolhido antes', () => {
    const row = { ...baseRow, responsibleId: 'e1', semExecutorFixo: true };
    expect(buildLoteFormData('cli1', 'os1', common, row).responsible_id).toBe('');
  });

  it('fluxo normal: envia o responsável escolhido', () => {
    const row = { ...baseRow, responsibleId: 'e1' };
    expect(buildLoteFormData('cli1', 'os1', common, row).responsible_id).toBe('e1');
  });
});
