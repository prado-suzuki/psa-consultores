import { describe, expect, it } from 'vitest';
import type { ProjetoRow } from '@/lib/dashboardClientesOs/types';
import { absorcaoPorFerramentas, cargaDosProjetos } from './boardProjetosCarga';

const p = (over: Partial<ProjetoRow> & Pick<ProjetoRow, 'projeto_id'>): ProjetoRow => ({
  projeto_nome: `P ${over.projeto_id}`,
  status_projeto: 'active',
  status_projeto_label: 'Ativo',
  cliente_id: 'c1',
  cliente_nome: 'Alfa',
  tipo_cliente: 'Fixo',
  categoria: 'A',
  cluster_id: 'cl',
  cluster_nome: 'Cluster',
  area_nome: 'Tax',
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
  ...over,
});

describe('cargaDosProjetos', () => {
  it('conta pessoas distintas e papéis; ordena por hora', () => {
    const carga = cargaDosProjetos(
      [p({ projeto_id: 'a', horas_estimadas: 10, valor_os: 50 }), p({ projeto_id: 'b', horas_estimadas: 80, valor_os: 200 })],
      [
        { project_id: 'b', user_id: 'u1', role: 'leader' },
        { project_id: 'b', user_id: 'u2', role: 'member' },
        { project_id: 'b', user_id: 'u1', role: 'responsible' },
      ],
    );
    expect(carga[0].projeto_id).toBe('b');
    expect(carga[0].pessoas).toBe(2);
    expect(carga[0].lideres).toBe(1);
    expect(carga[0].membros).toBe(1);
    expect(carga[0].horasPorPessoa).toBe(40);
    expect(carga[1].pessoas).toBe(0);
    expect(carga[1].horasPorPessoa).toBeNull();
  });
});

describe('absorcaoPorFerramentas', () => {
  it('divide hora liberada pela mediana das horas estimadas', () => {
    const projetos = [
      p({ projeto_id: '1', horas_estimadas: 40 }),
      p({ projeto_id: '2', horas_estimadas: 80 }),
      p({ projeto_id: '3', horas_estimadas: 120 }),
    ];
    const a = absorcaoPorFerramentas(160, projetos);
    expect(a.medianaHorasProjeto).toBe(80);
    expect(a.projetosAbsorviveis).toBe(2);
  });

  it('sem hora no cadastro não inventa capacidade', () => {
    expect(absorcaoPorFerramentas(100, [p({ projeto_id: '1' })]).projetosAbsorviveis).toBeNull();
    expect(absorcaoPorFerramentas(null, [p({ projeto_id: '1', horas_estimadas: 40 })]).projetosAbsorviveis).toBeNull();
  });
});
