import { describe, expect, it } from 'vitest';
import {
  AREA_STEP,
  clampAreaInput,
  converterArea,
  formatArea,
  unidadesEquivalentes,
} from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';
import {
  emptyMatriculaDraft,
  matriculaDraftToValues,
  matriculaToDraft,
} from '@/lib/diagnosticoPatrimonialModalModels';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';

// Cenário do aceite (B8), fora do caso MMS (que era rural, em hectare inteiro):
// uma matrícula URBANA de 699,8677 m², uma rural de 284,8610 ha e uma em
// "ha e m²" de 1.234 ha e 5.678 m². Os três precisam entrar, gravar e voltar com
// a mesma quantidade — a regra antiga truncava o urbano em 699,86.
const CASOS = [
  { rotulo: 'matrícula urbana em m²', digitado: '699.8677', unidade: 'm2', gravado: 699.8677 },
  { rotulo: 'matrícula rural em ha', digitado: '284.8610', unidade: 'ha', gravado: 284.861 },
  { rotulo: 'matrícula em ha e m²', digitado: '1234.5678', unidade: 'ha_m2', gravado: 1234.5678 },
];

// Ida e volta pelo formulário: digitação → payload do banco → rascunho de novo.
function idaEVolta(digitado: string, unidade: string) {
  const draft = {
    ...emptyMatriculaDraft('IR'),
    numero: '9.617',
    cartorio_id: 'cart-1',
    municipio_imovel: 'Sinop',
    uf_imovel: 'MT',
    area_unidade: unidade,
    area_documento: clampAreaInput(digitado),
  };
  const values = matriculaDraftToValues(draft, 'bem-1', null, 'IR');
  const volta = matriculaToDraft({
    ...values,
    id: 'mat-1',
  } as unknown as MatriculaRow);
  return { gravado: values.area_documento, volta: volta.area_documento };
}

describe('precisão de área', () => {
  it.each(CASOS)('$rotulo entra, grava e volta idêntica', ({ digitado, unidade, gravado }) => {
    expect(clampAreaInput(digitado)).toBe(digitado);
    const viagem = idaEVolta(digitado, unidade);
    expect(viagem.gravado).toBe(gravado);
    expect(Number(viagem.volta)).toBe(gravado);
  });

  it('corta só o que passa de quatro casas, sem arredondar', () => {
    expect(clampAreaInput('699.86775')).toBe('699.8677');
    expect(clampAreaInput('12')).toBe('12');
    expect(clampAreaInput('')).toBe('');
  });

  it('usa o mesmo passo de digitação em qualquer unidade', () => {
    expect(AREA_STEP).toBe('0.0001');
  });

  it('exibe cada unidade do seu jeito, sem esconder o que foi gravado', () => {
    expect(formatArea(699.8677, 'm2')).toBe('699,8677 m²');
    expect(formatArea(284.861, 'ha')).toBe('284,861 ha');
    expect(formatArea(1234.5678, 'ha_m2')).toBe('1.234 ha e 5.678 m²');
    expect(formatArea(null, 'ha')).toBe('—');
    // Valor que veio de uma conversão (mais casas que a digitação aceita).
    expect(formatArea(0.06998677, 'ha')).toBe('0,06998677 ha');
  });
});

describe('troca de unidade', () => {
  it('converte de fato entre m² e ha, preservando a quantidade', () => {
    expect(converterArea('699.8677', 'm2', 'ha')).toBe('0.06998677');
    expect(converterArea('0.06998677', 'ha', 'm2')).toBe('699.8677');
    expect(converterArea('1', 'ha', 'm2')).toBe('10000');
  });

  it('não mexe no número entre ha e "ha e m²", que são a mesma grandeza', () => {
    expect(unidadesEquivalentes('ha', 'ha_m2')).toBe(true);
    expect(converterArea('1234.5678', 'ha', 'ha_m2')).toBe('1234.5678');
    expect(converterArea('1234.5678', 'ha_m2', 'ha')).toBe('1234.5678');
  });

  it('deixa campo vazio ou não numérico como está', () => {
    expect(converterArea('', 'ha', 'm2')).toBe('');
    expect(converterArea('  ', 'ha', 'm2')).toBe('  ');
    expect(converterArea('abc', 'ha', 'm2')).toBe('abc');
  });

  it('ida e volta pela troca de unidade devolve a mesma quantidade', () => {
    for (const { digitado, unidade } of CASOS) {
      const emM2 = converterArea(digitado, unidade, 'm2');
      expect(Number(converterArea(emM2, 'm2', unidade))).toBeCloseTo(Number(digitado), 8);
    }
  });
});
