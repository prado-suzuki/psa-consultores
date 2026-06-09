import { describe, it, expect } from 'vitest';
import { numerarBlocos, unirBlocos } from './numeracao';
import { gerarDocumento } from './index';
import type { Bloco, Template } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string, extra: Partial<Bloco> = {}): Bloco => ({
  id,
  tipo,
  conteudo,
  obrigatorio: true,
  ...extra,
});

describe('numerarBlocos', () => {
  it('numera capítulos em romano e cláusulas em ordinal feminino contínuo', () => {
    const numerados = numerarBlocos([
      bloco('c1', 'capitulo', 'Denominação'),
      bloco('cl1', 'clausula', 'A sociedade girará sob o nome X.'),
      bloco('cl2', 'clausula', 'A sede será em Y.'),
      bloco('c2', 'capitulo', 'Objeto Social'),
      bloco('cl3', 'clausula', 'O objeto será Z.'),
    ]);
    expect(numerados[0].conteudo).toBe('*CAPÍTULO I*\nDenominação');
    expect(numerados[1].conteudo).toBe('*CLÁUSULA PRIMEIRA:* A sociedade girará sob o nome X.');
    expect(numerados[2].conteudo).toBe('*CLÁUSULA SEGUNDA:* A sede será em Y.');
    expect(numerados[3].conteudo).toBe('*CAPÍTULO II*\nObjeto Social');
    // contínua: não reseta ao trocar de capítulo
    expect(numerados[4].conteudo).toBe('*CLÁUSULA TERCEIRA:* O objeto será Z.');
  });

  it('parágrafo solitário vira Parágrafo Único', () => {
    const numerados = numerarBlocos([
      bloco('cl', 'clausula', 'Caput.'),
      bloco('p1', 'paragrafo', 'Texto do parágrafo.'),
    ]);
    expect(numerados[1].conteudo).toBe('*Parágrafo Único:* Texto do parágrafo.');
  });

  it('parágrafos consecutivos ganham ordinais masculinos resetando por cláusula', () => {
    const numerados = numerarBlocos([
      bloco('cl1', 'clausula', 'Capital.'),
      bloco('p1', 'paragrafo', 'Responsabilidade.'),
      bloco('p2', 'paragrafo', 'Integralização.'),
      bloco('cl2', 'clausula', 'Administração.'),
      bloco('p3', 'paragrafo', 'Vedação.'),
    ]);
    expect(numerados[1].conteudo).toBe('*Parágrafo Primeiro:* Responsabilidade.');
    expect(numerados[2].conteudo).toBe('*Parágrafo Segundo:* Integralização.');
    expect(numerados[4].conteudo).toBe('*Parágrafo Único:* Vedação.');
  });

  it('blocos livres (ou sem tipo) passam intactos', () => {
    const numerados = numerarBlocos([
      bloco('a', 'livre', 'Preâmbulo.'),
      bloco('b', undefined, 'Bloco legado.'),
    ]);
    expect(numerados[0].conteudo).toBe('Preâmbulo.');
    expect(numerados[1].conteudo).toBe('Bloco legado.');
  });
});

describe('unirBlocos', () => {
  it('parágrafo cola na cláusula com quebra simples; demais separam com linha em branco', () => {
    const texto = unirBlocos([
      bloco('cl', 'clausula', 'CLÁUSULA PRIMEIRA: Caput.'),
      bloco('p', 'paragrafo', 'Parágrafo Único: Detalhe.'),
      bloco('cl2', 'clausula', 'CLÁUSULA SEGUNDA: Outro caput.'),
    ]);
    expect(texto).toBe(
      'CLÁUSULA PRIMEIRA: Caput.\nParágrafo Único: Detalhe.\n\nCLÁUSULA SEGUNDA: Outro caput.',
    );
  });
});

describe('gerarDocumento com numeração', () => {
  it('a numeração reflete só os blocos que entraram (o caso "Parágrafo Único")', () => {
    const template: Template = {
      id: 't',
      nome: 'teste',
      blocos: [
        bloco('cl', 'clausula', 'O capital será de {{ capital }}.'),
        bloco('p1', 'paragrafo', 'A responsabilidade é restrita.'),
        bloco('p2', 'paragrafo', 'Bens integralizados.', { obrigatorio: false, flagsRequeridas: ['tem_imovel'] }),
      ],
    };
    const ctx = { capital: 'R$ 100,00' };

    // Com a flag: dois parágrafos numerados.
    expect(gerarDocumento(template, ctx, ['tem_imovel'])).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital será de R$ 100,00.\n' +
        '*Parágrafo Primeiro:* A responsabilidade é restrita.\n' +
        '*Parágrafo Segundo:* Bens integralizados.',
    );

    // Sem a flag: o sobrevivente vira Parágrafo Único — sem renumeração manual.
    expect(gerarDocumento(template, ctx)).toBe(
      '*CLÁUSULA PRIMEIRA:* O capital será de R$ 100,00.\n*Parágrafo Único:* A responsabilidade é restrita.',
    );
  });
});
