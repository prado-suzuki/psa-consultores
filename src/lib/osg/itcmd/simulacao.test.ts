import { describe, expect, it } from 'vitest';
import { simular, type EntradaSimulacao } from '@/lib/osg/itcmd/simulacao';

// Caso homologado do Santa Terezinha (SPEC §8): dois doadores, dois herdeiros
// partindo de zero quotas, competência de fevereiro de 2026. O universo de
// 6.649.400 quotas e os três totais do acervo são as ENTRADAS; os seis números do
// quadro de saída são o que o motor tem de reproduzir.
const santaTerezinha: EntradaSimulacao = {
  competencia: '2026-02',
  totalDeQuotas: '6649400',
  totaisDoAcervo: {
    contabil: '6649400.00',
    itr: '29155992.05',
    mercado: '322960281.82',
  },
  donatarios: [
    { donatarioId: 'gabriel', nome: 'Gabriel', quotasRecebidas: '3324700', doacaoAnterior: null },
    { donatarioId: 'rafael', nome: 'Rafael', quotasRecebidas: '3324700', doacaoAnterior: null },
  ],
};

describe('simulação — os seis passos do FLUXO', () => {
  it('referência ponta a ponta: o quadro de saída do Santa Terezinha', () => {
    const s = simular(santaTerezinha);

    expect(s.upf).toBe('255.20');
    expect(s.linhas.map((l) => l.percentual)).toEqual(['50.0000', '50.0000']);

    // Bases por cenário (SPEC §8, C79/F79/I79). A de ITR é o caso do
    // arredondamento: 50% de 29.155.992,05 é ...,025 e o publicado é ...,03.
    for (const linha of s.linhas) {
      expect(linha.porCenario.contabil).toEqual({ base: '3324700.00', imposto: '186864.00' });
      expect(linha.porCenario.itr).toEqual({ base: '14577996.03', imposto: '1087127.68' });
      expect(linha.porCenario.mercado).toEqual({ base: '161480140.91', imposto: '12839299.27' });
    }

    // Totais dos dois donatários (§8, C84/F84 e a convenção de arredondamento).
    expect(s.totaisPorCenario).toEqual({
      contabil: '373728.00',
      itr: '2174255.36',
      // Arredonda cada donatário e SOMA: ...,54. O WP soma antes e arredonda no
      // fim, dando ...,55. Convenção, não erro (SPEC §8, nota da célula I84).
      mercado: '25678598.54',
    });
    expect(s.cenariosIndisponiveis).toEqual([]);

    // Distribuir mais quotas do que existem é recusado, não escalado a >100%.
    expect(() => simular({
      ...santaTerezinha,
      donatarios: [
        ...santaTerezinha.donatarios,
        { donatarioId: 'x', nome: 'X', quotasRecebidas: '1', doacaoAnterior: null },
      ],
    })).toThrow(/quotas/i);
  });

  it('cenário sem valor informado sai como indisponível, nunca como zero', () => {
    // No cadastro de hoje o valor de mercado está vazio em todas as matrículas e
    // o de ITR em qualquer campo. Um cenário que soma parcial e se apresenta
    // como total é a pior saída possível numa ferramenta de decisão.
    const s = simular({
      ...santaTerezinha,
      totaisDoAcervo: { contabil: '6649400.00', itr: null, mercado: null },
    });
    expect(s.cenariosIndisponiveis).toEqual(['itr', 'mercado']);
    expect(s.totaisPorCenario.itr).toBeNull();
    expect(s.totaisPorCenario.mercado).toBeNull();
    expect(s.linhas[0].porCenario.itr).toBeNull();
    expect(s.linhas[0].porCenario.contabil).toEqual({
      base: '3324700.00', imposto: '186864.00',
    });
  });

  it('a doação anterior declarada muda a faixa do ato atual', () => {
    // Donatário que já recebeu R$ 831.175 e recebe agora o restante até
    // 3.324.700: o devido é f(3.324.700) − f(831.175) = 186.864,00 − 25.591,00.
    // O valor é DECLARADO pelo analista — derivar do quadro societário contaria
    // duas vezes, porque o quadro é foto do estado e não histórico (SPEC §4).
    const s = simular({
      ...santaTerezinha,
      totalDeQuotas: '6649400',
      totaisDoAcervo: { contabil: '6649400.00', itr: null, mercado: null },
      donatarios: [
        {
          donatarioId: 'gabriel',
          nome: 'Gabriel',
          quotasRecebidas: '2493525',
          doacaoAnterior: '831175.00',
        },
      ],
    });
    expect(s.linhas[0].porCenario.contabil).toEqual({
      base: '2493525.00', imposto: '161273.00',
    });
  });
});
