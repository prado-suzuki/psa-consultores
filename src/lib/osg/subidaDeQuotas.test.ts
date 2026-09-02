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

  it('recusa quando a controladora é a ÚNICA sócia: não sobrou o que subir', () => {
    const p = plano({ socios: [socio(CN, 'Controladora', 100)] });
    expect(p.problema).toMatch(/única sócia/);
    expect(p.lancamentos).toHaveLength(0);
  });

  it('recusa a forma de pagamento inválida, pela mesma regra do formulário', () => {
    // Sócio com quotas e valor zero (quadro legado): o aporte sairia pago com
    // quotas de valor zero, e quem recusava era o CHECK do banco. A conta do
    // valor não acusa nada aqui, porque 0 fecha com 0.
    const p = plano({ socios: [{ pessoaId: ANA, denominacao: 'Ana', quotas: 100, valor: 0 }] });
    expect(p.problema).toMatch(/valor das quotas entregues/);
  });
});

describe('a SEGUNDA concentração, depois de um aumento de capital', () => {
  // O ciclo real da casa: concentrada a primeira vez, a proprietária recebe
  // imóveis novos, os subscritores voltam ao quadro dela, e a alteração seguinte
  // concentra de novo. Aqui a holding já detém 4.234.822 e os dois que voltaram
  // trazem 300.000 cada. Antes, a presença da holding travava o macro inteiro.
  const segundaRodada = (p: Partial<ArgsDaSubida> = {}) =>
    plano({
      socios: [
        socio(CN, 'Controladora', 4234822),
        socio(ANA, 'Ana', 300000),
        socio(BRUNO, 'Bruno', 300000),
      ],
      quadroControladora: [socio(ANA, 'Ana', 2117911), socio(BRUNO, 'Bruno', 2117911)],
      ...p,
    });

  it('sobe só quem entrou, e a holding não cede para si mesma', () => {
    const { lancamentos, problema } = segundaRodada();
    expect(problema).toBeNull();
    // Duas cessões e dois aportes: a holding não aparece em nenhum dos dois.
    expect(lancamentos).toHaveLength(4);
    expect(lancamentos.some((l) => l.movimento.origemPessoaId === CN)).toBe(false);
    expect(lancamentos.slice(0, 2).map((l) => l.movimento.origemPessoaId)).toEqual([ANA, BRUNO]);
    expect(lancamentos.slice(0, 2).every((l) => l.movimento.destinoPessoaId === CN)).toBe(true);
    expect(lancamentos.slice(2).map((l) => l.movimento.quotas)).toEqual([300000, 300000]);
  });

  it('o aporte na controladora SOMA ao que o sócio já tinha lá', () => {
    const { quadroResultante } = segundaRodada();
    expect(quadroResultante).toEqual([
      expect.objectContaining({ pessoaId: ANA, quotas: 2417911 }),
      expect.objectContaining({ pessoaId: BRUNO, quotas: 2417911 }),
    ]);
  });

  it('a proprietária fica 100% da holding: o que subiu mais o que ela já tinha', () => {
    const { totalValorCedido } = segundaRodada();
    expect(totalValorCedido).toBe(600000);
  });

  it('o aviso de proporção mede a fatia REAL na proprietária, não a fatia de quem sobe', () => {
    // Ana tem 300.000 de um capital de 4.834.822 na proprietária: 6,205%, e não
    // os 50% que ela representa entre os dois que estão subindo.
    const { avisoDeProporcao } = segundaRodada();
    expect(avisoDeProporcao).toMatch(/6,205% na proprietária/);
  });
});
