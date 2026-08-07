import { describe, expect, it } from 'vitest';
import type { GerencialApiPorMes } from './types';
import { filtrarMesesFechados, mesEstaParcial, rotuloCluster } from './metricas';

const mesApi = (mes: string, usuariosAtivos: number): GerencialApiPorMes => ({
  mes,
  usuariosAtivos,
  usuariosNovos: 1,
  usuariosRetidos: Math.max(0, usuariosAtivos - 1),
  usuariosBaseRetencao: usuariosAtivos,
  taxaRetencao: usuariosAtivos > 0 ? (usuariosAtivos - 1) / usuariosAtivos : 0,
  chamadas: usuariosAtivos * 10,
  chamadasPorUsuario: usuariosAtivos > 0 ? 10 : 0,
  ferramentasAtivas: 3,
  taxaSucesso: 0.98,
});

describe('filtrarMesesFechados', () => {
  it('exclui o mês parcial do fim do período', () => {
    const serie = [mesApi('2026-07', 8), mesApi('2026-08', 3)];
    expect(filtrarMesesFechados(serie, '2026-08-06').map((item) => item.mes)).toEqual(['2026-07']);
  });

  it('mantém o mês quando o período termina no último dia', () => {
    expect(filtrarMesesFechados([mesApi('2026-07', 8)], '2026-07-31')).toHaveLength(1);
  });

  it('identifica explicitamente o mês parcial', () => {
    expect(mesEstaParcial('2026-08', '2026-08-06')).toBe(true);
    expect(mesEstaParcial('2026-07', '2026-07-31')).toBe(false);
  });
});

describe('rotuloCluster', () => {
  it('preserva nomes conhecidos e não exibe UUID inteiro no fallback', () => {
    expect(rotuloCluster('0523512c-f980-4236-8a7c-53e06c9c7a80')).toBe('PSA OSG');
    expect(rotuloCluster('cluster-desconhecido-123')).toBe('Cluster cluster-d');
    expect(rotuloCluster(null)).toBe('Sem vínculo');
  });
});
