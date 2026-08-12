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
  it('converte de fato entre as unidades, sem reinterpretar o número', () => {
    expect(converterArea('1', 'ha', 'm2')).toMatchObject({ valor: '10000', arredondou: false });
    expect(converterArea('10000', 'm2', 'ha')).toMatchObject({ valor: '1', arredondou: false });
    expect(converterArea('1234.5678', 'ha', 'm2')).toMatchObject({
      valor: '12345678', arredondou: false,
    });
  });

  it('arredonda ao teto de casas que gravamos e declara a perda', () => {
    // 699,8677 m² = 0,06998677 ha: oito casas não cabem no que o cadastro
    // comprovadamente guarda, e deixar o campo com elas faria o próximo toque
    // no input truncar a diferença em silêncio.
    const convertido = converterArea('699.8677', 'm2', 'ha');
    expect(convertido).toEqual({ valor: '0.07', arredondou: true, exato: '0.06998677' });
    // O aviso da tela usa `exato` e `valor` para mostrar o antes e o depois.
    expect(formatArea(Number(convertido.exato), 'ha')).toBe('0,06998677 ha');
    expect(formatArea(Number(convertido.valor), 'ha')).toBe('0,07 ha');
    expect(formatArea(Number(convertido.exato), 'ha_m2')).toBe('0 ha e 699,8677 m²');
    expect(formatArea(Number(convertido.valor), 'ha_m2')).toBe('0 ha e 700 m²');
  });

  it('toda conversão que declara arredondamento produz textos distintos no aviso', () => {
    const unidades = ['ha', 'm2', 'ha_m2'];
    // Propriedade sobre valores de 1 a 4 casas, incluindo frações pequenas e
    // próximas da virada do hectare — não apenas a matrícula que revelou N3.
    const valores = ['0.1', '0.01', '0.001', '0.0001', '1.2345', '12.3456', '699.8677', '9999.9999'];

    for (const de of unidades) {
      for (const para of unidades) {
        for (const valor of valores) {
          const convertido = converterArea(valor, de, para);
          if (!convertido.arredondou) continue;
          const antes = formatArea(Number(convertido.exato), para);
          const depois = formatArea(Number(convertido.valor), para);
          expect(antes, `${valor} ${de} → ${para}`).not.toBe(depois);
        }
      }
    }
  });

  it('não mexe no número entre ha e "ha e m²", que são a mesma grandeza', () => {
    expect(unidadesEquivalentes('ha', 'ha_m2')).toBe(true);
    expect(converterArea('1234.5678', 'ha', 'ha_m2')).toEqual({
      valor: '1234.5678', arredondou: false, exato: '1234.5678',
    });
    expect(converterArea('1234.5678', 'ha_m2', 'ha')).toMatchObject({ valor: '1234.5678' });
  });

  it('deixa campo vazio ou não numérico como está', () => {
    expect(converterArea('', 'ha', 'm2')).toMatchObject({ valor: '', arredondou: false });
    expect(converterArea('  ', 'ha', 'm2')).toMatchObject({ valor: '  ', arredondou: false });
    expect(converterArea('abc', 'ha', 'm2')).toMatchObject({ valor: 'abc', arredondou: false });
  });

  it('ida e volta preserva a quantidade quando ela cabe nas casas gravadas', () => {
    // Os três casos do aceite saem da sua unidade e voltam idênticos: nenhum
    // deles perde nada no caminho de ida (ha → m² é sempre exato).
    for (const { digitado, unidade } of CASOS) {
      const ida = converterArea(digitado, unidade, 'm2');
      const volta = converterArea(ida.valor, 'm2', unidade);
      expect(volta.arredondou).toBe(false);
      expect(Number(volta.valor)).toBeCloseTo(Number(digitado), 4);
    }
  });
});
