import { describe, it, expect } from 'vitest';
import {
  resumoPreenchimentoPorArea,
  linhaSemArea,
  faixaEmpresaPreenchimento,
  tituloLacuna,
  SEM_AREA_ID,
  type AreaCadastroPreenchimento,
  type ProjetoPreenchimento,
  type OsPreenchimento,
  type ClientePreenchimento,
} from './preenchimentoSistema';

const areas: AreaCadastroPreenchimento[] = [
  { id: 'a-tax', name: 'Tax', is_active: true, cost_center_id: 'cc-1' },
  { id: 'a-osg', name: 'OSG', is_active: true, cost_center_id: null },
  { id: 'a-inativa', name: 'Antiga', is_active: false, cost_center_id: null },
];

describe('resumoPreenchimentoPorArea', () => {
  it('lista só áreas ATIVAS -- inativa não aparece', () => {
    const linhas = resumoPreenchimentoPorArea(areas, []);
    expect(linhas.map((l) => l.id)).toEqual(['a-tax', 'a-osg']);
  });

  it('área com tudo preenchido -- linha limpa, zero em toda lacuna', () => {
    const projetos: ProjetoPreenchimento[] = [{
      id: 'p1', name: 'Projeto Completo', estrutura_area_id: 'a-tax',
      responsible_id: 'user-1', equipe_id: 'equipe-1',
      start_date: '2026-01-01', end_date: '2026-06-01', ordem_servico_id: 'os-1',
    }];
    const [tax] = resumoPreenchimentoPorArea(areas, projetos);
    expect(tax).toEqual({
      id: 'a-tax',
      label: 'Tax',
      projetos: 1,
      semResponsavel: { total: 0, nomes: [] },
      semEquipe: { total: 0, nomes: [] },
      semData: { total: 0, nomes: [] },
      semOs: { total: 0, nomes: [] },
      centroCustoFaltando: false,
    });
  });

  it('área com todos os tipos de lacuna -- cada contagem nomeia o projeto afetado', () => {
    const projetos: ProjetoPreenchimento[] = [{
      id: 'p2', name: 'Projeto Incompleto', estrutura_area_id: 'a-osg',
      responsible_id: null, equipe_id: null,
      start_date: null, end_date: null, ordem_servico_id: null,
    }];
    const [, osg] = resumoPreenchimentoPorArea(areas, projetos);
    expect(osg.projetos).toBe(1);
    expect(osg.semResponsavel).toEqual({ total: 1, nomes: ['Projeto Incompleto'] });
    expect(osg.semEquipe).toEqual({ total: 1, nomes: ['Projeto Incompleto'] });
    expect(osg.semData).toEqual({ total: 1, nomes: ['Projeto Incompleto'] });
    expect(osg.semOs).toEqual({ total: 1, nomes: ['Projeto Incompleto'] });
    // Área OSG não tem cost_center_id -- centro de custo FALTANDO.
    expect(osg.centroCustoFaltando).toBe(true);
  });

  it('data faltando conta quando SÓ início ou SÓ fim está nulo', () => {
    const projetos: ProjetoPreenchimento[] = [
      {
        id: 'p3', name: 'Só início', estrutura_area_id: 'a-tax',
        responsible_id: 'u', equipe_id: 'e', start_date: '2026-01-01', end_date: null, ordem_servico_id: 'os',
      },
      {
        id: 'p4', name: 'Só fim', estrutura_area_id: 'a-tax',
        responsible_id: 'u', equipe_id: 'e', start_date: null, end_date: '2026-06-01', ordem_servico_id: 'os',
      },
    ];
    const [tax] = resumoPreenchimentoPorArea(areas, projetos);
    expect(tax.semData.total).toBe(2);
  });

  it('consulta de projetos falhou (null) -- NUNCA mostra zero, mostra null em toda lacuna', () => {
    const linhas = resumoPreenchimentoPorArea(areas, null);
    for (const l of linhas) {
      expect(l.projetos).toBeNull();
      expect(l.semResponsavel).toEqual({ total: null, nomes: [] });
      expect(l.semEquipe).toEqual({ total: null, nomes: [] });
      expect(l.semData).toEqual({ total: null, nomes: [] });
      expect(l.semOs).toEqual({ total: null, nomes: [] });
    }
    // `centroCustoFaltando` não depende de org_projects -- continua real.
    expect(linhas.find((l) => l.id === 'a-osg')?.centroCustoFaltando).toBe(true);
    expect(linhas.find((l) => l.id === 'a-tax')?.centroCustoFaltando).toBe(false);
  });

  it('amostra de nomes respeita o limite de 10 e não trava com mais projetos', () => {
    const muitos: ProjetoPreenchimento[] = Array.from({ length: 15 }, (_, i) => ({
      id: `p-${i}`, name: `Projeto ${i}`, estrutura_area_id: 'a-tax',
      responsible_id: null, equipe_id: 'e', start_date: '2026-01-01', end_date: '2026-02-01', ordem_servico_id: 'os',
    }));
    const [tax] = resumoPreenchimentoPorArea(areas, muitos);
    expect(tax.semResponsavel.total).toBe(15);
    expect(tax.semResponsavel.nomes).toHaveLength(10);
  });
});

describe('linhaSemArea (residual)', () => {
  it('projeto sem estrutura_area_id vira o residual, com suas próprias lacunas', () => {
    const projetos: ProjetoPreenchimento[] = [
      {
        id: 'p5', name: 'Órfão', estrutura_area_id: null,
        responsible_id: null, equipe_id: 'e', start_date: '2026-01-01', end_date: '2026-02-01', ordem_servico_id: null,
      },
      {
        id: 'p6', name: 'Da Tax', estrutura_area_id: 'a-tax',
        responsible_id: 'u', equipe_id: 'e', start_date: '2026-01-01', end_date: '2026-02-01', ordem_servico_id: 'os',
      },
    ];
    const linha = linhaSemArea(projetos);
    expect(linha).not.toBeNull();
    expect(linha?.id).toBe(SEM_AREA_ID);
    expect(linha?.projetos).toBe(1);
    expect(linha?.semResponsavel.total).toBe(1);
    expect(linha?.semOs.total).toBe(1);
    // Projeto da Tax não entra no residual.
    expect(linha?.semResponsavel.nomes).toEqual(['Órfão']);
  });

  it('sem nenhum projeto órfão, devolve null -- não polui a tela com "0 sem área"', () => {
    const projetos: ProjetoPreenchimento[] = [{
      id: 'p7', name: 'Da Tax', estrutura_area_id: 'a-tax',
      responsible_id: 'u', equipe_id: 'e', start_date: '2026-01-01', end_date: '2026-02-01', ordem_servico_id: 'os',
    }];
    expect(linhaSemArea(projetos)).toBeNull();
  });

  it('consulta de projetos falhou -- devolve null (banner de falha da tela já avisa)', () => {
    expect(linhaSemArea(null)).toBeNull();
  });
});

describe('faixaEmpresaPreenchimento', () => {
  const os: OsPreenchimento[] = [
    { id: 'os-1', numero_os: '101/2026', data_inicio: '2026-01-01' },
    { id: 'os-2', numero_os: '102/2026', data_inicio: null },
    { id: 'os-3', numero_os: '103/2026', data_inicio: null },
  ];
  const clientes: ClientePreenchimento[] = [
    { id: 'c-1', nome: 'Cliente A', uf: 'SP', categoria: 'ouro' },
    { id: 'c-2', nome: 'Cliente B', uf: null, categoria: null },
    { id: 'c-3', nome: 'Cliente C', uf: 'RJ', categoria: null },
  ];

  it('conta lacunas sobre o total de cada base', () => {
    const faixa = faixaEmpresaPreenchimento(os, clientes);
    expect(faixa.osSemDataInicio).toEqual({ comLacuna: 2, total: 3, nomes: ['102/2026', '103/2026'] });
    expect(faixa.clientesSemUf).toEqual({ comLacuna: 1, total: 3, nomes: ['Cliente B'] });
    expect(faixa.clientesSemCategoria).toEqual({ comLacuna: 2, total: 3, nomes: ['Cliente B', 'Cliente C'] });
  });

  it('falha de consulta não vira zero -- cada fonte falha de forma independente', () => {
    const soOsFalhou = faixaEmpresaPreenchimento(null, clientes);
    expect(soOsFalhou.osSemDataInicio).toEqual({ comLacuna: null, total: null, nomes: [] });
    expect(soOsFalhou.clientesSemUf.comLacuna).toBe(1);

    const soClientesFalhou = faixaEmpresaPreenchimento(os, null);
    expect(soClientesFalhou.clientesSemUf).toEqual({ comLacuna: null, total: null, nomes: [] });
    expect(soClientesFalhou.clientesSemCategoria).toEqual({ comLacuna: null, total: null, nomes: [] });
    expect(soClientesFalhou.osSemDataInicio.comLacuna).toBe(2);

    const tudoFalhou = faixaEmpresaPreenchimento(null, null);
    expect(tudoFalhou.osSemDataInicio.comLacuna).toBeNull();
    expect(tudoFalhou.clientesSemUf.comLacuna).toBeNull();
    expect(tudoFalhou.clientesSemCategoria.comLacuna).toBeNull();
  });
});

describe('tituloLacuna', () => {
  it('falha de consulta -- frase de indisponibilidade, nunca vazio', () => {
    expect(tituloLacuna({ total: null, nomes: [] })).toMatch(/não foi possível medir/i);
  });

  it('zero -- frase neutra customizável', () => {
    expect(tituloLacuna({ total: 0, nomes: [] })).toBe('Nenhum');
    expect(tituloLacuna({ total: 0, nomes: [] }, 'Tudo cadastrado')).toBe('Tudo cadastrado');
  });

  it('lista os nomes da amostra sem "e mais" quando cabem todos', () => {
    expect(tituloLacuna({ total: 2, nomes: ['A', 'B'] })).toBe('A, B');
  });

  it('acrescenta "e mais N" quando o total excede a amostra', () => {
    expect(tituloLacuna({ total: 12, nomes: ['A', 'B', 'C'] })).toBe('A, B, C e mais 9');
  });
});
