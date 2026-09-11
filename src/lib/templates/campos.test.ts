import { describe, it, expect } from 'vitest';
import { classificarCaminho, lacunaDoTipo, marcacaoDoCaminho } from './campos';
import { gerarBlocos, gerarDocumento, pendenciasDoDocumento } from './index';
import { renderSegmentos } from './render';
import type { Bloco, Contexto, Template } from './types';

// B19 — campo manual não preenchido vira LACUNA ASSINALÁVEL.
// B2 (parte do motor) — os marcadores e a lista de pendências que a tela Gerar
// consome para nomear o que falta antes de baixar.
//
// O cenário NÃO é o contrato social da MMS: são uma ESCRITURA DE DOAÇÃO (que
// tem data manual e nenhum sócio) e um modelo de MATRÍCULA DIGITADA (que
// legitimamente não tem sócios nem capital), porque é a diferença entre esses
// dois que o aceite do B2 exige — o mesmo motor tem que alarmar num e calar no
// outro sem lista fixa de campos.

const bloco = (id: string, conteudo: string, tipo: Bloco['tipo'] = 'livre'): Bloco => ({
  id, tipo, conteudo, obrigatorio: true,
});

describe('classificação de caminho', () => {
  it('resolve o campo pelo papel do binding, com o rótulo do vocabulário', () => {
    expect(classificarCaminho('imovel.numero')).toMatchObject({
      label: 'Imóvel — Nº da matrícula', tipo: 'texto', obrigatorio: true, manual: false,
    });
    expect(classificarCaminho('socio2.nome')?.label).toBe('Sócio 2 — Nome / Denominação');
    expect(classificarCaminho('sociedade.capitalValor')?.obrigatorio).toBe(true);
    expect(classificarCaminho('sociedade.objeto')?.obrigatorio).toBe(false);
  });

  it('placeholder de topo declarado como manual é reconhecido; o resto não é campo', () => {
    expect(classificarCaminho('dataAssinatura')).toMatchObject({
      label: 'Data da assinatura', tipo: 'data', manual: true, obrigatorio: true,
    });
    expect(classificarCaminho('observacao')).toBeUndefined();
    expect(classificarCaminho('foo.bar')).toBeUndefined();
    expect(classificarCaminho('imovel.naoExiste')).toBeUndefined();
  });

  it('a lacuna vem do TIPO do campo, decidida em um lugar só', () => {
    expect(lacunaDoTipo('data')).toBe('____ de ______________ de 20__');
    expect(lacunaDoTipo('valor')).toBe('R$ __________');
    expect(lacunaDoTipo('inteiro')).toBe('______');
    expect(lacunaDoTipo('texto')).toBe('____________________');
    expect(lacunaDoTipo('textarea')).toBe('____________________');
  });

  it('só campo manual ou obrigatório produz marcação (o resto resolve "" como sempre)', () => {
    expect(marcacaoDoCaminho('dataAssinatura')).toEqual({
      lacuna: '____ de ______________ de 20__', obrigatorio: true,
    });
    expect(marcacaoDoCaminho('testemunha1Nome')).toEqual({ lacuna: '____________________' });
    expect(marcacaoDoCaminho('imovel.numero')).toEqual({ obrigatorio: true });
    expect(marcacaoDoCaminho('imovel.livro')).toBeUndefined();
  });
});

describe('B19 · campo manual vazio vira lacuna, e só ele', () => {
  it('o fecho para de sair "Sorriso/MT, ." e passa a ter onde escrever a data', () => {
    const template: Template = {
      id: 'doacao-fecho',
      nome: 'fecho da doação',
      blocos: [bloco('f', '{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.')],
    };
    const ctx: Contexto = { foroComarca: 'Sorriso', foroUf: 'MT', dataAssinatura: '' };
    expect(gerarDocumento(template, ctx)).toBe('Sorriso/MT, ____ de ______________ de 20__.');

    // Preenchido, o campo é ele mesmo — a lacuna não deixa rastro.
    ctx.dataAssinatura = '11 de agosto de 2026';
    expect(gerarDocumento(template, ctx)).toBe('Sorriso/MT, 11 de agosto de 2026.');
  });

  it('a lacuna é assinalável NO SEGMENTO: a tela distingue traço do bloco de campo em branco', () => {
    const segmentos = renderSegmentos(
      'Testemunha: {{ testemunha1Nome }} — {{ observacao }}',
      { testemunha1Nome: '', observacao: '' },
      [],
      { campo: marcacaoDoCaminho },
    );
    expect(segmentos).toEqual([
      { tipo: 'texto', texto: 'Testemunha: ' },
      { tipo: 'valor', texto: '____________________', caminho: 'testemunha1Nome', origem: undefined, lacuna: true },
      { tipo: 'texto', texto: ' — ' },
      // Placeholder livre NÃO declarado como manual continua resolvendo ''.
      { tipo: 'valor', texto: '', caminho: 'observacao', origem: undefined },
    ]);
  });
});

describe('B2 (motor) · pendências do documento', () => {
  const CONTRATO_SOCIAL: Template = {
    id: 'contrato',
    nome: 'Contrato social',
    blocos: [
      // Redação canônica do capital: o valor nominal da quota vem do binding e
      // nunca é vazio, então a cláusula NÃO é descartada por falta de capital —
      // ela fica, incompleta, e é justamente isso que a pendência denuncia.
      bloco('capital', 'O capital social é de R$ {{ sociedade.capitalValor }}, dividido em {{ sociedade.totalQuotas }} quotas de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}).', 'clausula'),
      bloco('sede', 'A sociedade {{ sociedade.razaoSocial }} tem sede em {{ sociedade.sedeMunicipio }}.', 'clausula'),
      bloco('fecho', '{{ foroComarca }}, {{ dataAssinatura }}.'),
    ],
  };

  const MATRICULA_DIGITADA: Template = {
    id: 'matricula',
    nome: 'Matrícula digitada',
    blocos: [
      bloco('imovel', 'Imóvel de matrícula nº {{ imovel.numero }}, com área de {{ imovel.area }}, do {{ imovel.cartorio }}.'),
    ],
  };

  it('modelo que legitimamente não tem sócios nem capital sai SEM alarme', () => {
    const ctx = {
      imovel: { numero: '9.617', area: '396,4000 ha', cartorio: '2º Ofício de Registro de Imóveis de Sinop' },
    };
    expect(pendenciasDoDocumento(gerarBlocos(MATRICULA_DIGITADA, ctx))).toEqual([]);
  });

  it('o mesmo motor NOMEIA o que falta quando o modelo pede capital e ele não veio', () => {
    const ctx = {
      sociedade: {
        capitalValor: '', totalQuotas: '',
        quotaValorNominal: '1,00', quotaValorNominalExtenso: 'um real',
        razaoSocial: 'Vale Verde Ltda.', sedeMunicipio: 'Sorriso',
      },
      foroComarca: 'Sorriso',
      dataAssinatura: '',
    };
    expect(pendenciasDoDocumento(gerarBlocos(CONTRATO_SOCIAL, ctx))).toEqual([
      { caminho: 'sociedade.capitalValor', label: 'Sociedade — Capital social (R$)', manual: false },
      { caminho: 'sociedade.totalQuotas', label: 'Sociedade — Total de quotas', manual: false },
      { caminho: 'dataAssinatura', label: 'Data da assinatura', manual: true },
    ]);
  });

  it('bloco DESCARTADO não gera pendência (senão a tela alarmaria pelo que nem saiu)', () => {
    const template: Template = {
      id: 'com-opcional',
      nome: 'com bloco opcional',
      blocos: [
        bloco('imovel', 'Imóvel de matrícula nº {{ imovel.numero }}.'),
        // Descrição de outro imóvel que o cliente não tem: some inteira.
        bloco('outro', 'O imóvel de matrícula nº {{ matricula.numero }} tem área de {{ matricula.area }}.'),
      ],
    };
    const blocos = gerarBlocos(template, {
      imovel: { numero: '9.617' },
      matricula: { numero: '', area: '' },
    });
    expect(blocos.map((b) => b.id)).toEqual(['imovel']);
    expect(pendenciasDoDocumento(blocos)).toEqual([]);
  });

  it('o mesmo campo pendente em vários blocos aparece uma vez só', () => {
    const template: Template = {
      id: 'repetido',
      nome: 'repetido',
      blocos: [
        bloco('a', 'Matrícula {{ imovel.numero }} e área {{ imovel.area }}.'),
        bloco('b', 'A matrícula {{ imovel.numero }} responde pelo ônus.'),
      ],
    };
    const pendencias = pendenciasDoDocumento(
      gerarBlocos(template, { imovel: { numero: '', area: '396,4000 ha' } }),
    );
    expect(pendencias).toEqual([
      { caminho: 'imovel.numero', label: 'Imóvel — Nº da matrícula', manual: false },
    ]);
  });
});

// Campo DERIVADO de um manual herda o `manual` da base.
//
// Sem isso o derivado resolvia '' e a cláusula de foro saía "Estado de ," — com a
// vírgula pendurada — e o fecho saía "em ______ () vias", com o parêntese vazio
// ao lado da lacuna da base. Herdando, os dois viram lacuna assinalável e a frase
// fica legível para quem vai preencher à mão.
describe('campo derivado de manual herda a lacuna', () => {
  it('o Estado por extenso do foro é lacuna, porque a UF do foro é digitada na tela Gerar', () => {
    expect(classificarCaminho('instrumento.foroUf')?.manual).toBe(true);
    expect(classificarCaminho('instrumento.foroUfExtenso')?.manual).toBe(true);
    expect(marcacaoDoCaminho('instrumento.foroUfExtenso')?.lacuna).toBe('____________________');
  });

  it('o número de vias por extenso também, e com a lacuna do TIPO de cada um', () => {
    // A base é inteiro (lacuna curta), o extenso é texto (traço longo): é o que
    // faz "em ______ (____________________) vias" em vez de "em ______ () vias".
    expect(marcacaoDoCaminho('instrumento.numeroVias')?.lacuna).toBe('______');
    expect(marcacaoDoCaminho('instrumento.numeroViasExtenso')?.lacuna).toBe('____________________');
  });

  it('o `obrigatorio` NÃO sobe: a pendência é da base, e contar as duas duplicaria o aviso', () => {
    expect(classificarCaminho('instrumento.foroUf')?.obrigatorio).toBe(true);
    expect(classificarCaminho('instrumento.foroUfExtenso')?.obrigatorio).toBe(false);
  });

  it('derivado de campo de CADASTRO segue não sendo lacuna', () => {
    // `areaExtenso` deriva de `area`, que vem da matrícula: não há o que preencher
    // à mão, e marcar lacuna aqui poria traço em documento completo.
    expect(classificarCaminho('imovel.areaExtenso')?.manual).toBe(false);
    expect(marcacaoDoCaminho('imovel.areaExtenso')).toBeUndefined();
  });
});
