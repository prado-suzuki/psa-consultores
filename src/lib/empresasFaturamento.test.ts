import { describe, it, expect } from 'vitest';
import { encontrarEmpresa, listarEmpresasCadastradas } from './empresasFaturamento';

const clusters = [
  { id: 'c-digital', name: 'Digital', nome_empresa: 'PRADO SUZUKI', cnpj: null },
  { id: 'c-tax', name: 'Tax', nome_empresa: 'PSA Consultoria Empresarial', cnpj: '12.345.678/0001-99' },
  { id: 'c-osg', name: 'OSG', nome_empresa: 'psa consultoria empresarial', cnpj: null },
  { id: 'c-legado', name: 'Legado', nome_empresa: '  PRADO SUZUKI  ', cnpj: '98.765.432/0001-11' },
  { id: 'c-sem', name: 'Sem empresa', nome_empresa: null, cnpj: null },
  { id: 'c-vazio', name: 'Vazio', nome_empresa: '   ', cnpj: '00.000.000/0000-00' },
];

describe('listarEmpresasCadastradas', () => {
  const empresas = listarEmpresasCadastradas(clusters);

  it('agrupa a mesma empresa digitada em caixa/espaços diferentes', () => {
    expect(empresas.map(e => e.nome)).toEqual(['PRADO SUZUKI', 'PSA Consultoria Empresarial']);
  });

  it('herda o CNPJ do primeiro cluster que o tem', () => {
    expect(empresas.find(e => e.nome === 'PRADO SUZUKI')?.cnpj).toBe('98.765.432/0001-11');
    expect(empresas.find(e => e.nome === 'PSA Consultoria Empresarial')?.cnpj).toBe('12.345.678/0001-99');
  });

  it('lista os clusters de cada empresa (com id) em ordem alfabética', () => {
    expect(empresas.find(e => e.nome === 'PRADO SUZUKI')?.clusters).toEqual([
      { id: 'c-digital', name: 'Digital' },
      { id: 'c-legado', name: 'Legado' },
    ]);
    expect(empresas.find(e => e.nome === 'PSA Consultoria Empresarial')?.clusters.map(c => c.name))
      .toEqual(['OSG', 'Tax']);
  });

  it('ignora cluster sem empresa ou com nome em branco', () => {
    expect(empresas).toHaveLength(2);
    expect(empresas.some(e => e.cnpj === '00.000.000/0000-00')).toBe(false);
  });

  it('devolve lista vazia quando nenhum cluster tem empresa', () => {
    expect(listarEmpresasCadastradas([{ id: 'c-x', name: 'X', nome_empresa: null, cnpj: null }])).toEqual([]);
  });
});

describe('encontrarEmpresa', () => {
  const empresas = listarEmpresasCadastradas(clusters);

  it('acha ignorando caixa e espaços', () => {
    expect(encontrarEmpresa(empresas, '  prado suzuki ')?.nome).toBe('PRADO SUZUKI');
  });

  it('devolve null para vazio ou desconhecido', () => {
    expect(encontrarEmpresa(empresas, '')).toBeNull();
    expect(encontrarEmpresa(empresas, null)).toBeNull();
    expect(encontrarEmpresa(empresas, 'Outra Empresa')).toBeNull();
  });
});
