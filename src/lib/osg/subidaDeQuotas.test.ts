import { describe, it, expect } from 'vitest';
import { planejarSubidaDeQuotas, type ArgsDaSubida, type SocioQueSobe } from './subidaDeQuotas';

const PR = 'empresa-proprietaria';
const CN = 'empresa-controladora';
const ANA = 'pessoa-ana';
const BRUNO = 'pessoa-bruno';

const socio = (pessoaId: string, denominacao: string, quotas: number): SocioQueSobe => ({
  pessoaId,
  denominacao,
  quotas,
  valor: quotas,
});

const plano = (p: Partial<ArgsDaSubida> = {}) =>
  planejarSubidaDeQuotas({
    proprietariaPessoaId: PR,
    controladoraPessoaId: CN,
    socios: [socio(ANA, 'Ana', 2117411), socio(BRUNO, 'Bruno', 2117411)],
    quadroControladora: [socio(ANA, 'Ana', 500), socio(BRUNO, 'Bruno', 500)],
    dataMovimento: '2023-12-28',
    ...p,
  });

describe('planejarSubidaDeQuotas: o par espelhado', () => {
  it('grava a cessão na proprietária e o aporte na controladora, na mesma data', () => {
    const { lancamentos } = plano();
    expect(lancamentos).toHaveLength(4);
    expect(lancamentos.every((l) => l.movimento.dataMovimento === '2023-12-28')).toBe(true);

    // Primeiro as cessões: só se integraliza com o que já foi cedido.
    expect(lancamentos.slice(0, 2)).toEqual([
      expect.objectContaining({
        empresaPessoaId: PR,
        movimento: expect.objectContaining({
          tipo: 'cessao',
          origemPessoaId: ANA,
          destinoPessoaId: CN,
          quotas: 2117411,
          sequencia: 1,
        }),
      }),
      expect.objectContaining({
        empresaPessoaId: PR,
        movimento: expect.objectContaining({ tipo: 'cessao', origemPessoaId: BRUNO, sequencia: 2 }),
      }),
    ]);
  });

  it('o aporte na controladora é pago com as quotas da proprietária', () => {
    const aporte = plano().lancamentos[2];
    expect(aporte.empresaPessoaId).toBe(CN);
    expect(aporte.movimento).toMatchObject({
      tipo: 'aporte',
      origemPessoaId: null,
      destinoPessoaId: ANA,
      quotas: 2117411,
      sequencia: 3,
      pagamento: { tipo: 'quotas', empresaPessoaId: PR, quotas: 2117411, valor: 2117411 },
    });
  });

  it('o invariante fecha: valor cedido igual a valor aportado', () => {
    const p = plano();
    expect(p.problema).toBeNull();
    expect(p.totalValorCedido).toBe(p.totalValorAportado);
    expect(p.totalValorCedido).toBe(4234822);
  });

  it('a subida é 1:1 em VALOR, e a quantidade sai do valor', () => {
    // Quadro legado em que o valor não é a quantidade de quotas ao nominal:
    // é o valor que manda, e a divergência é acusada em vez de gravada.
    const p = plano({ socios: [{ pessoaId: ANA, denominacao: 'Ana', quotas: 100, valor: 250 }] });
    expect(p.lancamentos[1].movimento.quotas).toBe(250);
    expect(p.problema).toBeNull();
  });

  it('acusa antes de gravar quando o valor do quadro não fecha com as quotas', () => {
    const p = plano({ socios: [{ pessoaId: ANA, denominacao: 'Ana', quotas: 100, valor: 250.4 }] });
    expect(p.problema).toMatch(/não fecha/);
  });
});

describe('planejarSubidaDeQuotas: o quadro resultante', () => {
  it('SOMA ao capital de constituição da controladora, não substitui', () => {
    // O caso MMS: 500 de constituição mais 2.117.411 que sobem.
    expect(plano().quadroResultante).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 2117911 }),
      expect.objectContaining({ pessoaId: BRUNO, quotas: 2117911 }),
    ]);
  });

  it('não avisa nada quando as duas proporções batem', () => {
    expect(plano().avisoDeProporcao).toBeNull();
  });

  it('avisa o desalinhamento com os números quando a proporção não se reproduz', () => {
    // Proprietária 2/3 e 1/3, controladora constituída meio a meio.
    const p = plano({
      socios: [socio(ANA, 'Ana', 2000), socio(BRUNO, 'Bruno', 1000)],
      quadroControladora: [socio(ANA, 'Ana', 500), socio(BRUNO, 'Bruno', 500)],
    });
    expect(p.avisoDeProporcao).toMatch(/Ana: 66,667% na proprietária, 62,500% na controladora/);
    expect(p.avisoDeProporcao).toMatch(/alteração contratual própria/);
    // Avisa, mas não impede: a decisão é do consultor.
    expect(p.problema).toBeNull();
    expect(p.lancamentos).toHaveLength(4);
  });

  it('sócio que só existe na proprietária entra no quadro da controladora', () => {
    const p = plano({ quadroControladora: [socio(ANA, 'Ana', 1000)] });
    expect(p.quadroResultante.map((s) => s.pessoaId)).toEqual([ANA, BRUNO]);
  });
});

describe('planejarSubidaDeQuotas: o que ele recusa', () => {
  it('recusa a mesma empresa dos dois lados', () => {
    expect(plano({ controladoraPessoaId: PR }).problema).toMatch(/mesma empresa/);
  });

  it('recusa proprietária sem quadro: não há o que subir', () => {
    expect(plano({ socios: [] }).problema).toMatch(/não tem quadro societário/);
  });

  it('recusa repetir a subida quando a controladora já é sócia', () => {
    const p = plano({ socios: [socio(CN, 'Controladora', 100)] });
    expect(p.problema).toMatch(/já subiram/);
    expect(p.lancamentos).toHaveLength(0);
  });
});
