import { describe, it, expect } from 'vitest';
import {
  calcularCapitalSociedade,
  calcularParticipacoesPR,
  mapearAdministrador,
  mapearBem,
  mapearIntegralizacoes,
  mapearMatricula,
  mapearPartesSelecionadas,
  mapearPessoa,
  mapearQuadroSocietario,
  mapearSociedade,
  mapearSocio,
  reidratarItensPorLista,
  tituloColetivoDosSocios,
  type ItemLista,
  type MatriculaIntegralizacao,
  type MatriculaParaMapear,
  type SocioParaMapear,
  type TitularParaMapear,
} from './mapeadores';
import { tituloDoInstrumento, TITULO_CONSTITUICAO } from './instrumento';
import { gerarDocumento } from './index';
import { origemDe } from './origem';
import { derivarCampos } from './vocabulario';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { Template } from './types';

type Campos = Record<string, string>;

/** Matrícula mínima: só os titulares importam para estes testes. */
function matriculaCom(titulares: TitularParaMapear[]): MatriculaParaMapear {
  return {
    numero: '2.628', livro: null, folha: null,
    municipio_imovel: null, uf_imovel: null,
    area_documento: null, area_unidade: null, vlr_contabil: null,
    confrontacoes_texto: null, descricao_psa_completa: null,
    bem: null, cartorio: null, titulares,
  };
}

function socio(denominacao: string, quotas: number, vlr_total: number): SocioParaMapear {
  return {
    pessoa: { denominacao, tipo_pessoa: 'PF', genero: 'M' } as unknown as PessoaRow,
    quotas,
    vlr_total,
    representante: null,
  };
}

describe('mapearQuadroSocietario — enumeração, administração e outorga', () => {
  const pessoa = (denominacao: string, over: Record<string, unknown> = {}) =>
    ({
      pessoa: { id: denominacao.toLowerCase(), denominacao, tipo_pessoa: 'PF', genero: 'M', ...over } as unknown as PessoaRow,
      quotas: 50,
      vlr_total: 50,
      representante: null,
    }) as SocioParaMapear;

  it('numera os sócios em romano minúsculo (caput do capital em moeda corrente)', () => {
    const { itens } = mapearQuadroSocietario([pessoa('A'), pessoa('B'), pessoa('C')]);
    expect(itens.map((i) => (i.socio as Record<string, string>).ordemRomana)).toEqual(['i', 'ii', 'iii']);
    expect(itens.map((i) => (i.socio as Record<string, string>).ordem)).toEqual(['1', '2', '3']);
  });

  it('marca quem administra, e o ramo oposto junto (o engine não tem else)', () => {
    const { itens } = mapearQuadroSocietario([pessoa('A'), pessoa('B')], new Set(['a']));
    const campos = itens.map((i) => i.socio as Record<string, string>);
    expect([campos[0].administrador, campos[0].naoAdministrador]).toEqual(['sim', '']);
    expect([campos[1].administrador, campos[1].naoAdministrador]).toEqual(['', 'sim']);
  });

  it('sem lista de administradores, ninguém administra', () => {
    const { itens } = mapearQuadroSocietario([pessoa('A')]);
    expect((itens[0].socio as Record<string, string>).administrador).toBe('');
  });

  it('rótulo da assinatura concorda com o gênero', () => {
    const { itens } = mapearQuadroSocietario([pessoa('Maria', { genero: 'F' })], new Set(['maria']));
    const campos = itens[0].socio as Record<string, string>;
    expect(campos.socioAdministrador).toBe('Sócia administradora');
    expect(campos.socioTitulo).toBe('Sócia');
  });

  it.each([
    ['Comunhão Parcial', 'sim'],
    ['Comunhão Universal', 'sim'],
    ['Participação Final nos Aquestos', 'sim'],
    ['Separação Total', ''],
    [null, ''],
  ])('regime %s exige outorga conjugal: %s', (regime, esperado) => {
    const { itens } = mapearQuadroSocietario([pessoa('A', { regime_bens: regime })]);
    expect((itens[0].socio as Record<string, string>).exigeOutorgaConjugal).toBe(esperado);
  });
});

describe('mapearQuadroSocietario — percentual calculado e total', () => {
  it('injeta socio.percentual (quotas ÷ total) e agrega a linha total', () => {
    const { itens, total } = mapearQuadroSocietario([
      socio('Sócio A', 75, 75),
      socio('Sócio B', 25, 25),
    ]);

    expect((itens[0].socio as Campos).percentual).toBe('75,000%');
    expect((itens[1].socio as Campos).percentual).toBe('25,000%');
    // Campos por sócio continuam disponíveis sob o escopo "socio".
    expect((itens[0].socio as Campos).quotas).toBe('75');
    expect((itens[0].socio as Campos).vlrTotal).toBe('75,00');

    expect(total.quotas).toBe('100');
    expect(total.vlrTotal).toBe('100,00');
    expect(total.percentual).toBe('100,000%');
  });

  it('sem quotas: total fica vazio (não força 0%) e não quebra', () => {
    const { itens, total } = mapearQuadroSocietario([socio('Sócio sem quota', 0, 0)]);
    expect(total).toEqual({});
    expect((itens[0].socio as Campos).percentual).toBeUndefined();
  });
});

describe('mapearSociedade — PJ objeto do contrato', () => {
  const pj = {
    tipo_pessoa: 'PJ',
    denominacao: 'MMS Agro Ltda',
    cpf_cnpj: '12.345.678/0001-90',
    nire: '5320000000',
    junta_comercial_uf: 'MT',
    data_constituicao: '2024-03-01',
    objeto_social: 'Exploração da atividade rural',
    endereco_logradouro: 'Rua das Acácias',
    endereco_numero: '119',
    endereco_bairro: 'Centro',
    endereco_municipio: 'Cuiabá',
    endereco_uf: 'MT',
    endereco_cep: '78000-000',
  } as unknown as PessoaRow;

  it('mapeia razão social, CNPJ, NIRE e objeto', () => {
    const c = mapearSociedade(pj);
    expect(c.razaoSocial).toBe('MMS Agro Ltda');
    expect(c.cnpj).toBe('12.345.678/0001-90');
    expect(c.nire).toBe('5320000000');
    expect(c.objeto).toBe('Exploração da atividade rural');
  });

  it('expande UF por extenso (junta e sede) e formata a data', () => {
    const c = mapearSociedade(pj);
    expect(c.juntaUfExtenso).toBe('Mato Grosso');
    expect(c.sedeUfExtenso).toBe('Mato Grosso');
    expect(c.dataConstituicao).toBe('01/03/2024');
  });

  it('monta a sede em prosa e nas partes atômicas', () => {
    const c = mapearSociedade(pj);
    expect(c.sede).toContain('Rua das Acácias');
    expect(c.sede).toContain('nº 119');
    expect(c.sede).toContain('no município de Cuiabá');
    expect(c.sedeEndereco).toBe('Rua das Acácias, nº 119');
    expect(c.sedeBairro).toBe('Centro');
    expect(c.sedeMunicipio).toBe('Cuiabá');
    expect(c.sedeCep).toBe('78000-000');
  });

  it('campos do catálogo ausentes viram "" (cadastro incompleto não trava a prévia)', () => {
    const c = mapearSociedade({ tipo_pessoa: 'PJ', denominacao: 'Vazia Ltda' } as unknown as PessoaRow);
    expect(c.objeto).toBe('');
    expect(c.sedeMunicipio).toBe('');
    expect(c.razaoSocial).toBe('Vazia Ltda');
  });

  it('formata o capital calculado e deriva os extensos', () => {
    const c = mapearSociedade(pj, { capitalValor: 1500, totalQuotas: 1500 });
    expect(c.capitalValor).toBe('1.500,00');
    expect(c.capitalExtenso).toBe('mil e quinhentos reais');
    expect(c.totalQuotas).toBe('1.500');
    // Feminino porque conta QUOTAS: os contratos registrados escrevem
    // "872.674 (oitocentas e setenta e duas mil, seiscentas e setenta e quatro) quotas".
    // O valor em reais segue masculino ("mil e quinhentos reais"), acima.
    expect(c.totalQuotasExtenso).toBe('mil e quinhentas');
  });

  it('publica capital anterior e aumento com extensos para a resolução', () => {
    const c = mapearSociedade(
      pj,
      { capitalValor: 5_272_449, totalQuotas: 5_272_449 },
      { capitalAnterior: 525_744, capitalDelta: 4_746_705 },
    );
    expect(c.capitalAnterior).toBe('525.744,00');
    expect(c.capitalAnteriorExtenso).toBe('quinhentos e vinte e cinco mil, setecentos e quarenta e quatro reais');
    expect(c.capitalDelta).toBe('4.746.705,00');
    expect(c.capitalDeltaExtenso).toBe('quatro milhões, setecentos e quarenta e seis mil, setecentos e cinco reais');
  });

  it('sem capital calculado, os campos resolvem em branco (condicionais pulam)', () => {
    const c = mapearSociedade(pj, { capitalValor: null, totalQuotas: null });
    expect(c.capitalValor).toBe('');
    expect(c.capitalExtenso).toBe('');
    expect(c.totalQuotas).toBe('');
    expect(c.totalQuotasExtenso).toBe('');
  });
});

describe('tituloColetivoDosSocios', () => {
  const pessoa = (tipoPessoa: 'PF' | 'PJ', genero: 'M' | 'F' | null): SocioParaMapear => ({
    pessoa: { tipo_pessoa: tipoPessoa, genero } as PessoaRow,
    quotas: 1,
    vlr_total: 1,
    representante: null,
  });

  it('concorda número e gênero do quadro societário', () => {
    expect(tituloColetivoDosSocios([pessoa('PF', 'M')])).toBe('Único sócio');
    expect(tituloColetivoDosSocios([pessoa('PF', 'F')])).toBe('Única sócia');
    expect(tituloColetivoDosSocios([pessoa('PF', 'F'), pessoa('PJ', null)])).toBe('Únicas sócias');
    expect(tituloColetivoDosSocios([pessoa('PF', 'F'), pessoa('PF', 'M')])).toBe('Únicos sócios');
  });
});

describe('tituloDoInstrumento — a peça se nomeia pela posição na sucessão', () => {
  it('sem alteração anterior, é a constituição', () => {
    expect(tituloDoInstrumento(0)).toBe(TITULO_CONSTITUICAO);
    expect(tituloDoInstrumento(null)).toBe(TITULO_CONSTITUICAO);
    expect(tituloDoInstrumento(undefined)).toBe(TITULO_CONSTITUICAO);
  });

  it('numera a alteração por extenso, no feminino que "alteração" pede', () => {
    expect(tituloDoInstrumento(1)).toBe('PRIMEIRA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL');
    expect(tituloDoInstrumento(2)).toBe('SEGUNDA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL');
    expect(tituloDoInstrumento(11)).toBe('DÉCIMA PRIMEIRA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL');
  });

  it('o mapeador publica o NÚMERO, e o título se deriva dele no vocabulário', () => {
    const pj = { tipo_pessoa: 'PJ', denominacao: 'Ipê Ltda' } as unknown as PessoaRow;

    const constituicao = mapearSociedade(pj);
    expect(constituicao.numeroAlteracao).toBe('0');
    expect(constituicao.tituloInstrumento).toBe(TITULO_CONSTITUICAO);

    const primeira = mapearSociedade(pj, undefined, { numeroAlteracao: 1 });
    expect(primeira.numeroAlteracao).toBe('1');
    expect(primeira.tituloInstrumento).toBe('PRIMEIRA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL');
  });

  it('corrigir a numeração é corrigir o NÚMERO: o ordinal se reescreve sozinho', () => {
    // O título é campo derivado, então ele não é entrada de formulário: o que a
    // tela oferece para editar é o número, e derivarCampos reescreve o título.
    const campos = derivarCampos('sociedade', { numeroAlteracao: '3' });
    expect(campos.tituloInstrumento).toBe('TERCEIRA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL');
  });
});

describe('calcularCapitalSociedade — PR (integralizações) × demais (quadro societário)', () => {
  const empresaPR = { tipo_empresa: 'PR' } as unknown as PessoaRow;
  const empresaCN = { tipo_empresa: 'CN' } as unknown as PessoaRow;

  // Com titular: é ele que recebe as quotas. Matrícula SEM titular fica fora do
  // capital (e do rateio) — caso próprio, mais abaixo.
  const matDeValor = (vlr: number | null, vlrBem: number | null = null): MatriculaParaMapear => ({
    ...matriculaCom([{ denominacao: 'Titular Único', pessoaId: 't1' }]),
    vlr_contabil: vlr,
    bem: vlrBem != null ? { denominacao: null, vlr_contabil: vlrBem, ccir_codigo: null } : null,
  });

  it('PR: capital = Σ valor contábil das integralizações (fallback no bem), quotas a R$ 1,00', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(
      empresaPR,
      [socio('Ignorado', 999, 999)], // quadro NÃO entra no cálculo de PR
      [matDeValor(558413.55), matDeValor(null, 314260.45)],
    );
    expect(capitalValor).toBe(872674);
    expect(totalQuotas).toBe(872674);
  });

  it('PR: o capital SEGUE as quotas — valor com centavos não fica no capital (B6)', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(empresaPR, [], [matDeValor(100.6)]);
    // Antes: capital 100,60 dividido em 101 quotas de R$ 1,00 (a cláusula se
    // contradizia). Agora as quotas mandam e o capital é o valor delas.
    expect(totalQuotas).toBe(101);
    expect(capitalValor).toBe(101);
  });

  it('PR sem integralização aprovada → nulls', () => {
    const r = calcularCapitalSociedade(empresaPR, [socio('A', 10, 10)], []);
    expect(r).toEqual({ capitalValor: null, totalQuotas: null, quotaValorNominal: 1 });
  });

  it('CN sem quotas digitadas: converte os valores do quadro, em vez de perder o capital', () => {
    const semQuotas = {
      pessoa: { denominacao: 'A', tipo_pessoa: 'PF' } as unknown as PessoaRow,
      quotas: null,
      vlr_total: 250.4,
      representante: null,
    };
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(empresaCN, [semQuotas], []);
    expect(totalQuotas).toBe(250);
    expect(capitalValor).toBe(250);
  });

  it('CN: Σ quotas e Σ vlr_total do quadro societário', () => {
    const { capitalValor, totalQuotas } = calcularCapitalSociedade(
      empresaCN,
      [socio('A', 600, 600), socio('B', 900, 900)],
      [matDeValor(999999)], // integralizações NÃO entram fora de PR
    );
    expect(capitalValor).toBe(1500);
    expect(totalQuotas).toBe(1500);
  });

  it('quadro vazio fora de PR → nulls', () => {
    const r = calcularCapitalSociedade(empresaCN, [], []);
    expect(r).toEqual({ capitalValor: null, totalQuotas: null, quotaValorNominal: 1 });
  });
});

describe('mapearMatricula — titularidade (forma inteira × fracionada)', () => {
  it('titular único: forma inteira, sem fração nem remanescente', () => {
    const c = mapearMatricula(matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a' }]));
    expect(c.proprietario).toBe('José Eduardo');
    // Campo opcional sem valor resolve '' (presente e falso), nunca ausente: é
    // o que faz {{#imovel.fracionado}} pular o trecho em vez de derrubar a prévia.
    expect(c.percentual).toBe('');
    expect(c.remanescente).toBe('');
    expect(c.fracionado).toBe('');
  });

  it('composse sem integralizador: "A e B" (forma inteira)', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a' },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b' },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo e Maria Auxiliadora');
    expect(c.fracionado).toBe('');
  });

  it('integralizador com fração: lidera a frase, demais viram remanescente', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
      ]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe('50,000%');
    expect(c.percentualExtenso).toBe('cinquenta inteiros por cento');
    expect(c.remanescente).toBe('Maria Auxiliadora');
    expect(c.fracionado).toBe('sim');
  });

  it('integralizador sem outros titulares: não fraciona (não há remanescente)', () => {
    const c = mapearMatricula(
      matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 }]),
    );
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe('');
    expect(c.fracionado).toBe('');
  });

  it('deduplica as duas linhas (posse de fato + de direito) da mesma pessoa', () => {
    const c = mapearMatricula(
      matriculaCom([
        { denominacao: 'José Eduardo', pessoaId: 'a', integralizador: true, fracao: 50 },
        { denominacao: 'José Eduardo', pessoaId: 'a', fracao: 50 },
        { denominacao: 'Maria Auxiliadora', pessoaId: 'b', fracao: 50 },
      ]),
    );
    // José aparece uma vez (líder); Maria é o remanescente — sem duplicar.
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.remanescente).toBe('Maria Auxiliadora');
  });
});

/** Matrícula com os campos da DESCRIÇÃO do imóvel (área, classificação, bem enriquecido). */
function matriculaImovel(over: Partial<MatriculaParaMapear>): MatriculaParaMapear {
  return {
    ...matriculaCom([{ denominacao: 'José Eduardo', pessoaId: 'a' }]),
    municipio_imovel: 'Cuiabá',
    uf_imovel: 'MT',
    ...over,
  };
}

// B4 — o nome CADASTRADO da serventia é o que identifica o cartório, e a
// comarca entra só como complemento. O cenário do aceite não é o da MMS
// ("Cartório de 1° Ofício de Imóveis", nome que não traz a cidade): é o cartório
// de Sinop, cujo nome JÁ traz a comarca, contra o cadastro sem nome nenhum — os
// dois extremos que a frase tem que atravessar sem sair torta.
describe('mapearMatricula — cartório: nome cadastrado + comarca como complemento (B4)', () => {
  // Como o bloco vivo escreve: a serventia vem depois do registro da matrícula.
  const REDACAO =
    'Matrícula {{ imovel.numero }} do {{ imovel.cartorio }}' +
    '{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}';

  /** Só o trecho do cartório, para o assert não repetir o número da matrícula. */
  function frase(cartorio: MatriculaParaMapear['cartorio']): string {
    const campos = mapearMatricula(matriculaImovel({ cartorio }));
    const template: Template = {
      id: 'cartorio', nome: 'cartório',
      blocos: [{ id: 'b', obrigatorio: true, conteudo: REDACAO }],
    };
    return gerarDocumento(template, { imovel: campos }).replace('Matrícula 2.628 ', '');
  }

  it('cartório cujo nome JÁ traz a cidade não repete a comarca', () => {
    expect(frase({ nome_completo: '2º Ofício de Registro de Imóveis de Sinop', comarca: 'Sinop', uf: 'MT' }))
      .toBe('do 2º Ofício de Registro de Imóveis de Sinop');
  });

  it('cartório cujo nome NÃO traz a cidade recebe a comarca como complemento', () => {
    expect(frase({ nome_completo: 'Cartório de 1° Ofício de Imóveis', comarca: 'Lucas do Rio Verde', uf: 'MT' }))
      .toBe('do Cartório de 1° Ofício de Imóveis da comarca de Lucas do Rio Verde');
  });

  it('cartório SEM nome preenchido continua gerando frase gramatical', () => {
    expect(frase({ nome_completo: null, comarca: 'Sorriso', uf: 'MT' }))
      .toBe('do Cartório de Registro de Imóveis da comarca de Sorriso');
    expect(frase(null)).toBe('do Cartório de Registro de Imóveis');
    // A guarda da linha distingue vínculo real do fallback, inclusive quando o
    // cartório cadastrado também não tem comarca.
    expect(mapearMatricula(matriculaImovel({ cartorio: { nome_completo: null, comarca: null, uf: null } })).temCartorio)
      .toBe('sim');
    expect(mapearMatricula(matriculaImovel({ cartorio: null })).temCartorio).toBe('');
  });

  it('comarca que também é palavra do rótulo ("Registro", SP) NÃO é suprimida', () => {
    // Um teste de substring apagaria a comarca de toda serventia chamada
    // "Cartório de Registro de Imóveis", que é quase todas: a comparação é pelo
    // FIM do nome, que é onde a serventia diz a cidade.
    expect(frase({ nome_completo: 'Cartório de Registro de Imóveis', comarca: 'Registro', uf: 'SP' }))
      .toBe('do Cartório de Registro de Imóveis da comarca de Registro');
    // E na serventia da própria comarca de Registro, some, como deve.
    expect(frase({ nome_completo: 'Oficial de Registro de Imóveis de Registro', comarca: 'Registro', uf: 'SP' }))
      .toBe('do Oficial de Registro de Imóveis de Registro');
  });

  it('sigla de UF colada no fim do nome não atrapalha a supressão', () => {
    expect(frase({ nome_completo: '2º Ofício de Registro de Imóveis de Sinop - MT', comarca: 'Sinop', uf: 'MT' }))
      .toBe('do 2º Ofício de Registro de Imóveis de Sinop - MT');
  });

  it('a redundância é detectada sem depender de acento ou de caixa', () => {
    const c = mapearMatricula(matriculaImovel({
      cartorio: { nome_completo: 'CARTÓRIO DE REGISTRO DE IMÓVEIS DE VARZEA GRANDE', comarca: 'Várzea Grande', uf: 'MT' },
    }));
    expect(c.cartorioComarca).toBe('');
    // A comarca crua continua disponível para quem precisar dela isolada.
    expect(c.comarca).toBe('Várzea Grande');
  });
});

// B14 — o padrão da casa é numeral E extenso lado a lado ("no Livro 02 (dois),
// folhas/ficha 01 (um)"), não só o extenso.
describe('mapearMatricula — livro e folha: numeral acompanha o extenso (B14)', () => {
  it('valor numérico ganha zero à esquerda até dois dígitos; o extenso não muda', () => {
    const c = mapearMatricula(matriculaImovel({ livro: '2', folha: '1' }));
    expect(c.livroNumeral).toBe('02');
    expect(c.folhaNumeral).toBe('01');
    expect(c.livroExtenso).toBe('dois');
    expect(c.folhaExtenso).toBe('um');
  });

  it('com dois dígitos ou mais, sai como está', () => {
    const c = mapearMatricula(matriculaImovel({ livro: '13', folha: '145' }));
    expect(c.livroNumeral).toBe('13');
    expect(c.folhaNumeral).toBe('145');
  });

  it('livro auxiliar não é número: sai ÍNTEGRO (o cartório o registra assim)', () => {
    const c = mapearMatricula(matriculaImovel({ livro: '2-AUX', folha: '3-Auxiliar' }));
    expect(c.livroNumeral).toBe('2-AUX');
    expect(c.folhaNumeral).toBe('3-Auxiliar');
    // E o extenso continua sendo só o extenso: não vira "02 (dois)".
    expect(c.livroExtenso).toBe('');
  });

  it('a redação canônica sai como o padrão da PSA', () => {
    const campos = mapearMatricula(matriculaImovel({ livro: '2', folha: '1' }));
    const template: Template = {
      id: 'livro', nome: 'livro',
      blocos: [{
        id: 'b', obrigatorio: true,
        conteudo: 'no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}), ' +
          'folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }})',
      }],
    };
    expect(gerarDocumento(template, { imovel: campos })).toBe('no Livro 02 (dois), folhas/ficha 01 (um)');
  });
});

// Achado da L3: matrícula com livro/folha nulos derrubava a prévia inteira, e
// não só o placeholder — {{#imovel.livro}} virava "Seção não resolvida".
describe('mapearMatricula — campo opcional ausente publica "" em vez de sumir', () => {
  it('livro, folha, comarca e UF do cartório nulos resolvem vazio', () => {
    const c = mapearMatricula(matriculaImovel({ livro: null, folha: null, cartorio: null }));
    expect(c.livro).toBe('');
    expect(c.folha).toBe('');
    expect(c.comarca).toBe('');
    expect(c.ufCartorio).toBe('');
    // Os derivados acompanham, sem inventar nada.
    expect(c.livroNumeral).toBe('');
    expect(c.folhaExtenso).toBe('');
  });

  it('a guarda {{#imovel.livro}} pula o trecho em vez de derrubar o render', () => {
    const campos = mapearMatricula(matriculaImovel({ livro: null, folha: null, cartorio: null }));
    const template: Template = {
      id: 'guarda', nome: 'guarda',
      blocos: [{
        id: 'b', obrigatorio: true,
        conteudo: 'Matrícula {{ imovel.numero }}' +
          '{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }}{{/imovel.livro}}' +
          '{{#imovel.comarca}}, da comarca de {{ imovel.comarca }}{{/imovel.comarca}}.',
      }],
    };
    expect(gerarDocumento(template, { imovel: campos })).toBe('Matrícula 2.628.');
  });
});

describe('mapearMatricula — confrontações sem o ponto final (quem pontua é o modelo)', () => {
  it('poda o ponto final do texto do cartório', () => {
    const c = mapearMatricula(
      matriculaImovel({ confrontacoes_texto: 'Norte: com o Lote 04, na extensão de 12,00 metros.' }),
    );
    expect(c.confrontacoes).toBe('Norte: com o Lote 04, na extensão de 12,00 metros');
  });

  it('texto sem ponto final fica intacto', () => {
    const c = mapearMatricula(matriculaImovel({ confrontacoes_texto: 'Norte: com o Lote 04' }));
    expect(c.confrontacoes).toBe('Norte: com o Lote 04');
  });

  it('vale para o fallback da descrição PSA', () => {
    const c = mapearMatricula(
      matriculaImovel({ confrontacoes_texto: null, descricao_psa_completa: 'Inicia-se no vértice A9D.' }),
    );
    expect(c.confrontacoes).toBe('Inicia-se no vértice A9D');
  });

  it('não engole abreviação interna nem espaço no meio', () => {
    const c = mapearMatricula(matriculaImovel({ confrontacoes_texto: 'Conforme matrícula n.º 12, ao norte.' }));
    expect(c.confrontacoes).toBe('Conforme matrícula n.º 12, ao norte');
  });
});

describe('mapearMatricula — classificação do imóvel (condicionais rural/urbano/posse)', () => {
  it('IR liga rural e desliga urbano', () => {
    const c = mapearMatricula(matriculaImovel({ tipo_bem: 'IR' }));
    expect(c.tipoBem).toBe('IR');
    expect(c.rural).toBe('sim');
    expect(c.urbano).toBe('');
  });

  it('IB liga urbano e desliga rural', () => {
    const c = mapearMatricula(matriculaImovel({ tipo_bem: 'IB' }));
    expect(c.urbano).toBe('sim');
    expect(c.rural).toBe('');
  });

  it('matrícula legada sem tipo_bem cai no tipo do BEM (que é NOT NULL)', () => {
    const c = mapearMatricula(matriculaImovel({
      tipo_bem: null,
      bem: { denominacao: null, vlr_contabil: null, ccir_codigo: null, tipo_bem: 'IR' },
    }));
    expect(c.tipoBem).toBe('IR');
    expect(c.rural).toBe('sim');
  });

  it('o tipo da MATRÍCULA prevalece sobre o do bem (desmembramento urbano de bem rural)', () => {
    const c = mapearMatricula(matriculaImovel({
      tipo_bem: 'IB',
      bem: { denominacao: null, vlr_contabil: null, ccir_codigo: null, tipo_bem: 'IR' },
    }));
    expect(c.urbano).toBe('sim');
    expect(c.rural).toBe('');
  });

  it('sem tipo em nenhum dos dois: nenhuma das duas liga (não se escolhe variante por palpite)', () => {
    const c = mapearMatricula(matriculaImovel({ tipo_bem: null }));
    expect(c.rural).toBe('');
    expect(c.urbano).toBe('');
  });

  it.each(['Posse', 'posse', 'Composse', 'Posse de fato'])(
    'exploração %s liga a condicional de direitos não averbados (casa por substring)',
    (exploracao) => {
      const c = mapearMatricula(matriculaImovel({ tipo_bem: 'IR', tipo_exploracao_posse: exploracao }));
      expect(c.tipoExploracaoPosse).toBe(exploracao);
      expect(c.posse).toBe('sim');
    },
  );

  it.each(['Exploração Direta', 'Arrendamento', 'Parceria', 'Comodato', 'Outro', null])(
    'exploração %s NÃO liga posse (é contrato/exploração, não título pendente)',
    (exploracao) => {
      const c = mapearMatricula(matriculaImovel({ tipo_bem: 'IR', tipo_exploracao_posse: exploracao }));
      expect(c.posse).toBe('');
    },
  );
});

describe('mapearMatricula — endereço do imóvel (identificação do urbano)', () => {
  const URBANO = matriculaImovel({
    tipo_bem: 'IB',
    bem: {
      denominacao: 'Sala 12', vlr_contabil: null, ccir_codigo: null,
      inscricao_municipal: '1.234.567-8',
      endereco_logradouro: 'Rua das Acácias', endereco_numero: '119',
      endereco_complemento: 'apartamento 302', endereco_bairro: 'Centro',
      endereco_cep: '78000-000',
    },
  });

  it('publica as cinco partes atômicas e a inscrição municipal', () => {
    const c = mapearMatricula(URBANO);
    expect(c.enderecoLogradouro).toBe('Rua das Acácias');
    expect(c.enderecoNumero).toBe('119');
    expect(c.enderecoComplemento).toBe('apartamento 302');
    expect(c.enderecoBairro).toBe('Centro');
    expect(c.enderecoCep).toBe('78000-000');
    expect(c.inscricaoMunicipal).toBe('1.234.567-8');
  });

  it('a prosa junta as partes com município e UF da MATRÍCULA (fonte única)', () => {
    expect(mapearMatricula(URBANO).endereco).toBe(
      'Rua das Acácias, nº 119, apartamento 302, bairro Centro, ' +
        'no município de Cuiabá, Estado de Mato Grosso, CEP: 78000-000',
    );
  });

  it('o número em prosa evita o "nº s/n" do modelo', () => {
    expect(mapearMatricula(URBANO).enderecoNumeroProsa).toBe('nº 119');
    const semNumero = mapearMatricula({
      ...URBANO,
      bem: { ...URBANO.bem!, endereco_numero: 's/n' },
    });
    // O cru continua cru (quem já usa {{ enderecoNumero }} não muda de comportamento).
    expect(semNumero.enderecoNumero).toBe('s/n');
    expect(semNumero.enderecoNumeroProsa).toBe('s/nº');
  });

  it('reaproveita as regras de prosa da pessoa (s/nº e bairro já prefixado)', () => {
    const c = mapearMatricula({
      ...URBANO,
      bem: { ...URBANO.bem!, endereco_numero: 's/n', endereco_complemento: null, endereco_bairro: 'zona rural' },
    });
    expect(c.endereco).toBe(
      'Rua das Acácias, s/nº, zona rural, no município de Cuiabá, Estado de Mato Grosso, CEP: 78000-000',
    );
  });

  it('sem logradouro não há endereço: o campo resolve vazio (não "no município de…")', () => {
    const c = mapearMatricula(matriculaImovel({ tipo_bem: 'IR' }));
    expect(c.endereco).toBe('');
    expect(c.enderecoLogradouro).toBe('');
  });

  it('com bem cadastrado mas sem logradouro (o caso do rural) também não há endereço', () => {
    const c = mapearMatricula(matriculaImovel({
      tipo_bem: 'IR',
      bem: {
        denominacao: 'Fazenda Tarumã', vlr_contabil: null, ccir_codigo: '901.032.174.190-6',
        endereco_logradouro: null, endereco_numero: '119', endereco_bairro: 'Centro',
        endereco_cep: '78000-000',
      },
    }));
    expect(c.endereco).toBe('');
    // As partes atômicas que existem seguem publicadas: quem falta é só a prosa.
    expect(c.enderecoNumero).toBe('119');
    expect(c.enderecoBairro).toBe('Centro');
  });
});

describe('mapearMatricula — área construída e a condicional temAreaConstruida', () => {
  function comAreas(over: {
    tipo_bem?: string | null;
    area_documento: number | null;
    area_unidade: string | null;
    construida: number | null;
  }): MatriculaParaMapear {
    return matriculaImovel({
      tipo_bem: over.tipo_bem ?? 'IB',
      area_documento: over.area_documento,
      area_unidade: over.area_unidade,
      bem: {
        denominacao: null, vlr_contabil: null, ccir_codigo: null,
        area_construida_m2: over.construida,
      },
    });
  }

  it('construída menor que a total liga o trecho', () => {
    const c = mapearMatricula(comAreas({ area_documento: 360, area_unidade: 'm2', construida: 87.5 }));
    expect(c.areaConstruida).toBe('87,5000 m²');
    expect(c.temAreaConstruida).toBe('sim');
  });

  it('construída igual à total NÃO liga (o modelo só cita quando é inferior)', () => {
    const c = mapearMatricula(comAreas({ area_documento: 360, area_unidade: 'm2', construida: 360 }));
    expect(c.temAreaConstruida).toBe('');
  });

  it('construída maior que a total NÃO liga', () => {
    const c = mapearMatricula(comAreas({ area_documento: 360, area_unidade: 'm2', construida: 400 }));
    expect(c.temAreaConstruida).toBe('');
  });

  it('sem área construída: campo vazio e condicional desligada', () => {
    const c = mapearMatricula(comAreas({ area_documento: 360, area_unidade: 'm2', construida: null }));
    expect(c.areaConstruida).toBe('');
    expect(c.temAreaConstruida).toBe('');
  });

  it.each([0, -10])(
    'construída %s é cadastro inválido, não construção: campo vazio e condicional desligada',
    (construida) => {
      const c = mapearMatricula(comAreas({ area_documento: 360, area_unidade: 'm2', construida }));
      // Sem o guard, o Math.abs de formatarArea faria -10 sair como "10,0000 m²".
      expect(c.areaConstruida).toBe('');
      expect(c.temAreaConstruida).toBe('');
    },
  );

  it('compara entre unidades: 200 m² construídos em 1 ha de área total', () => {
    const c = mapearMatricula(comAreas({ tipo_bem: 'IR', area_documento: 1, area_unidade: 'ha', construida: 200 }));
    expect(c.temAreaConstruida).toBe('sim');
  });

  it('construída igual à total em hectare NÃO liga, apesar do ruído de ponto flutuante', () => {
    // 0,1005 ha × 10.000 = 1005.0000000000001 em float: sem a tolerância de
    // 0,01 m², um lote todo construído sairia como "sendo … de área construída".
    const c = mapearMatricula(comAreas({ tipo_bem: 'IR', area_documento: 0.1005, area_unidade: 'ha', construida: 1005 }));
    expect(c.temAreaConstruida).toBe('');
  });

  it('sem área total comparável fica desligada (não se afirma "inferior" sem os dois lados)', () => {
    const c = mapearMatricula(comAreas({ area_documento: null, area_unidade: null, construida: 87.5 }));
    expect(c.areaConstruida).toBe('87,5000 m²');
    expect(c.temAreaConstruida).toBe('');
  });
});

describe('mapearMatricula — área na unidade do imóvel', () => {
  function comArea(tipo_bem: string | null, area_documento: number, area_unidade: string) {
    return mapearMatricula(matriculaImovel({ tipo_bem, area_documento, area_unidade }));
  }

  it('urbano em m² sai em m², com o extenso em metros quadrados', () => {
    const c = comArea('IB', 360, 'm2');
    expect(c.area).toBe('360,0000 m²');
    expect(c.areaUnidade).toBe('m2');
    expect(c.areaExtenso).toBe('trezentos e sessenta metros quadrados');
  });

  it('preserva as quatro casas do documento urbano no numeral e no extenso', () => {
    const c = comArea('IB', 699.8677, 'm2');
    expect(c.area).toBe('699,8677 m²');
    expect(c.areaExtenso).toBe(
      'seiscentos e noventa e nove metros quadrados e oito mil seiscentos e setenta e sete centímetros quadrados',
    );
  });

  it('RURAL em m² segue convertido para hectare (regressão: contrato rural mede em ha)', () => {
    const c = comArea('IR', 3964000, 'm2');
    expect(c.area).toBe('396,4000 ha');
    expect(c.areaUnidade).toBe('ha');
    expect(c.areaExtenso).toBe('trezentos e noventa e seis hectares e quarenta ares');
  });

  it('rural em hectare não muda', () => {
    const c = comArea('IR', 396.4, 'ha');
    expect(c.area).toBe('396,4000 ha');
    expect(c.areaExtenso).toBe('trezentos e noventa e seis hectares e quarenta ares');
  });

  it("'ha_m2' já é hectare, e as 4 decimais são os m² (1,0360 = 1 ha e 360 m²)", () => {
    const c = comArea('IR', 1.036, 'ha_m2');
    expect(c.area).toBe('1,0360 ha');
    // 360 m² = 3 ares e 60 centiares: a decomposição do extenso casa um para um.
    expect(c.areaExtenso).toBe('um hectare, três ares e sessenta centiares');
  });

  it.each(['ha', 'ha_m2'])(
    'urbano cadastrado em %s é convertido para m² (simétrico ao rural, que converte m² em ha)',
    (unidade) => {
      const c = comArea('IB', 1.036, unidade);
      expect(c.area).toBe('10.360,0000 m²');
      expect(c.areaUnidade).toBe('m2');
      expect(c.areaExtenso).toBe('dez mil, trezentos e sessenta metros quadrados');
    },
  );

  it('apartamento cadastrado em hectare não sai em ares (bug original do imóvel urbano)', () => {
    const c = comArea('IB', 0.036, 'ha');
    expect(c.area).toBe('360,0000 m²');
    expect(c.areaExtenso).toBe('trezentos e sessenta metros quadrados');
  });

  it('sem tipo_bem, m² vira hectare (comportamento antigo, para dado legado)', () => {
    const c = comArea(null, 3964000, 'm2');
    expect(c.area).toBe('396,4000 ha');
    expect(c.areaUnidade).toBe('ha');
  });
});

describe('mapearIntegralizacoes — alíneas por sócio com referência cruzada (padrão MMS)', () => {
  function socioIntegralizante(id: string, denominacao: string): SocioParaMapear {
    return {
      pessoa: { id, denominacao, tipo_pessoa: 'PF', genero: 'M' } as unknown as PessoaRow,
      quotas: 100,
      vlr_total: 100,
      representante: null,
    };
  }

  function matIntegralizacao(
    id: string,
    numero: string,
    vlr: number | null,
    titulares: TitularParaMapear[],
  ): MatriculaIntegralizacao {
    return {
      id, numero, livro: null, folha: null,
      municipio_imovel: null, uf_imovel: null,
      area_documento: null, area_unidade: null, vlr_contabil: vlr,
      confrontacoes_texto: null, descricao_psa_completa: null,
      bem: null, cartorio: null, titulares,
    };
  }

  const jose = socioIntegralizante('j', 'José Eduardo');
  const maria = socioIntegralizante('m', 'Maria Auxiliadora');
  const meio = (pessoaId: string, denominacao: string): TitularParaMapear =>
    ({ pessoaId, denominacao, fracao: 50 });

  // m1: condomínio 50/50 exato; m2: 50/50 com centavo ímpar (caso MMS real);
  // m3: só do José (titular único, sem fração).
  const matriculas = [
    matIntegralizacao('m1', '2.424', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    matIntegralizacao('m2', '2.623', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    matIntegralizacao('m3', '9.617', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
  ];

  const imovel = (item: ItemLista, i: number) =>
    ((item.imoveis as ItemLista[])[i].imovel as Record<string, string>);
  const flag = (item: ItemLista, i: number, chave: string) =>
    (item.imoveis as ItemLista[])[i][chave] as boolean;

  it('um item por sócio (ordem do quadro), com a ordem como dado da relação', () => {
    const itens = mapearIntegralizacoes([jose, maria], matriculas);
    expect(itens).toHaveLength(2);
    expect((itens[0].socio as Record<string, string>).ordem).toBe('1');
    expect((itens[1].socio as Record<string, string>).ordem).toBe('2');
    expect((itens[0].imoveis as ItemLista[])).toHaveLength(3);
    expect((itens[1].imoveis as ItemLista[])).toHaveLength(2);
  });

  it('1ª ocorrência sai completa (fração à frente, remanescente); o sócio do parágrafo lidera', () => {
    const [pJose] = mapearIntegralizacoes([jose, maria], matriculas);
    const a = imovel(pJose, 0);
    expect(flag(pJose, 0, 'completa')).toBe(true);
    expect(flag(pJose, 0, 'referencia')).toBe(false);
    expect(a.alinea).toBe('a');
    expect(a.proprietario).toBe('José Eduardo');
    expect(a.percentual).toBe('50,000%');
    expect(a.percentualExtenso).toBe('cinquenta inteiros por cento');
    expect(a.remanescente).toBe('Maria Auxiliadora');
    expect(a.valor).toBe('125.000,00');
    expect(a.fracionado).toBe('sim');
  });

  it('ocorrência seguinte sai como referência, com refItem apontando ao ITEM da 1ª descrição', () => {
    const [pJose, pMaria] = mapearIntegralizacoes([jose, maria], matriculas);
    const a = imovel(pMaria, 0);
    expect(flag(pMaria, 0, 'referencia')).toBe(true);
    expect(flag(pMaria, 0, 'completa')).toBe(false);
    expect(a.alinea).toBe('a');
    expect(a.refAlinea).toBe('a');
    expect(a.refSocio).toBe('José Eduardo');
    expect(a.numero).toBe('2.424');
    expect(a.proprietario).toBe('Maria Auxiliadora');
    expect(a.remanescente).toBe('José Eduardo');
    // Identidade, não número: quem numera ("parágrafo segundo") é a composição,
    // carimbando {{ ref }} neste mesmo objeto.
    expect((pMaria.imoveis as ItemLista[])[0].refItem).toBe(pJose);
  });

  it('reidratarItensPorLista religa refItem ao item real após o round-trip do snapshot (jsonb)', () => {
    const itens = mapearIntegralizacoes([jose, maria], matriculas);
    // Snapshot jsonb: JSON.stringify duplica refItem (cópia solta) → quebra a identidade.
    const snapshot = JSON.parse(JSON.stringify({ integralizacoes: itens })) as {
      integralizacoes: ItemLista[];
    };
    const [sJose, sMaria] = snapshot.integralizacoes;
    expect((sMaria.imoveis as ItemLista[])[0].refItem).not.toBe(sJose);

    reidratarItensPorLista(snapshot);
    // Identidade restaurada: refItem aponta ao item de topo do MESMO array (onde
    // a composição carimba {{ ref }}).
    expect((sMaria.imoveis as ItemLista[])[0].refItem).toBe(sJose);
  });

  it('fecha os centavos no último sócio (69.013,61 + 69.013,60 = 138.027,21, como no MMS)', () => {
    const [pJose, pMaria] = mapearIntegralizacoes([jose, maria], matriculas);
    expect(imovel(pJose, 1).valor).toBe('69.013,61');
    expect(imovel(pMaria, 1).valor).toBe('69.013,60');
  });

  it('titular único sem fração: forma inteira, valor cheio, sem percentual', () => {
    const [pJose] = mapearIntegralizacoes([jose, maria], matriculas);
    const c = imovel(pJose, 2);
    expect(c.alinea).toBe('c');
    expect(c.proprietario).toBe('José Eduardo');
    expect(c.percentual).toBe(''); // ausente vira '' na lista (condicional pula o trecho)
    expect(c.valor).toBe('558.413,55');
    expect(c.fracionado).toBe('');
    expect(c.inteiro).toBe('sim');
    expect(c.livro).toBe(''); // campo de cadastro vazio não derruba a prévia
  });

  it('sócio sem imóvel E sem lançamento no livro fica fora da lista', () => {
    const semImovel = socioIntegralizante('x', 'Sócio Capitalista');
    const itens = mapearIntegralizacoes([jose, semImovel, maria], matriculas);
    expect(itens).toHaveLength(2);
    expect((itens[1].socio as Record<string, string>).ordem).toBe('2');
  });

  describe('{{#aportes}} — as alíneas mistas', () => {
    const aporte = (item: ItemLista, i: number) =>
      ((item.aportes as ItemLista[])[i].aporte as Record<string, string>);

    it('sem livro, é a mesma lista de {{#imoveis}}, letra por letra', () => {
      // É o que garante que um bloco escrito na seção nova não saia vazio na
      // constituição da PR, cujo quadro ainda é derivado dos bens.
      const [pJose] = mapearIntegralizacoes([jose, maria], matriculas);
      expect(pJose.aportes as ItemLista[]).toHaveLength(3);
      expect((pJose.aportes as ItemLista[])[0]).toBe((pJose.imoveis as ItemLista[])[0]);
      expect(aporte(pJose, 0).alinea).toBe('a');
      expect(aporte(pJose, 2).alinea).toBe('c');
      expect(aporte(pJose, 0).valor).toBe('125.000,00');
      expect((pJose.aportes as ItemLista[])[0].seImovel).toBe(true);
    });

    it('mistura imóvel, moeda corrente e quotas de outra sociedade, na ordem do livro', () => {
      const holding = {
        id: 'pr', denominacao: 'Farroupilha Comércio Ltda', tipo_pessoa: 'PJ',
        cpf_cnpj: '11.111.111/0001-11', nire: '41205555555',
      } as unknown as PessoaRow;

      const [pJose] = mapearIntegralizacoes([jose, maria], matriculas, [
        { id: 'mov-1', pessoaId: 'j', quotas: 1000, valor: 1000, forma: 'moeda' },
        {
          id: 'mov-2', pessoaId: 'j', quotas: 2117411, valor: 2117411, forma: 'quotas',
          origem: {
            pessoa: holding,
            administradores: 'José Eduardo',
            quotas: 2117411,
            valor: 2117411,
          },
        },
      ]);

      const alineas = pJose.aportes as ItemLista[];
      // Moeda e quotas primeiro (ordem do livro), imóveis não mencionados no fim.
      expect(alineas.map((a) => [a.seMoeda, a.seQuotas, a.seImovel])).toEqual([
        [true, false, false],
        [false, true, false],
        [false, false, true],
        [false, false, true],
        [false, false, true],
      ]);
      expect(alineas.map((_, i) => aporte(pJose, i).alinea)).toEqual(['a', 'b', 'c', 'd', 'e']);

      expect(aporte(pJose, 0).valor).toBe('1.000,00');
      expect(aporte(pJose, 1).quotas).toBe('2.117.411');
      expect(aporte(pJose, 1).quotasExtenso).toMatch(/^dois milhões/);

      // A PJ de origem sai qualificada por inteiro, com o representante.
      const origem = alineas[1].origem as Record<string, string>;
      expect(origem.razaoSocial).toBe('Farroupilha Comércio Ltda');
      expect(origem.cnpj).toBe('11.111.111/0001-11');
      expect(origem.nire).toBe('41205555555');
      expect(origem.quotas).toBe('2.117.411');
      expect(origem.representante).toBe('José Eduardo');
    });

    it('o aporte em bem vira a alínea da matrícula daquele bem', () => {
      const comBem = matriculas.map((m, i) => ({ ...m, bemId: `bem-${i + 1}` }));
      const [pJose] = mapearIntegralizacoes([jose, maria], comBem, [
        { id: 'mov-1', pessoaId: 'j', quotas: 558414, valor: 558414, forma: 'bem', bemId: 'bem-3' },
        { id: 'mov-2', pessoaId: 'j', quotas: 125000, valor: 125000, forma: 'bem', bemId: 'bem-1' },
      ]);
      const alineas = pJose.aportes as ItemLista[];
      // A ordem é a do LIVRO: o terceiro imóvel vem primeiro.
      expect((alineas[0].imovel as Record<string, string>).numero).toBe('9.617');
      expect((alineas[1].imovel as Record<string, string>).numero).toBe('2.424');
      // O que o livro não mencionou entra no fim, para nada sumir em silêncio.
      expect((alineas[2].imovel as Record<string, string>).numero).toBe('2.623');
      // O valor da alínea continua sendo o da FRAÇÃO, não o do bem inteiro.
      expect(aporte(pJose, 1).valor).toBe('125.000,00');
    });

    it('sócio SEM imóvel entra pelo livro: o aporte pago em quotas rende alínea', () => {
      // É a integralização da controladora: os sócios pagaram o aporte com as
      // quotas que tinham na proprietária, e nenhum deles é titular de matrícula.
      // A guarda antiga (só matrícula) os pulava, a lista voltava vazia e o motor
      // descartava o bloco — a peça saía sem nomear a PJ de origem.
      const farroupilha = {
        id: 'pr', denominacao: 'Farroupilha Comércio Ltda', tipo_pessoa: 'PJ',
        cpf_cnpj: '11.111.111/0001-11', nire: '41205555555',
      } as unknown as PessoaRow;
      const socioA = socioIntegralizante('a', 'Sócio A');
      const socioB = socioIntegralizante('b', 'Sócio B');

      const itens = mapearIntegralizacoes([socioA, socioB], [], [
        {
          id: 'mov-1', pessoaId: 'a', quotas: 585900, valor: 585900, forma: 'quotas',
          origem: { pessoa: farroupilha, administradores: 'Sócio A', quotas: 585900, valor: 585900 },
        },
        {
          id: 'mov-2', pessoaId: 'b', quotas: 585900, valor: 585900, forma: 'quotas',
          origem: { pessoa: farroupilha, administradores: 'Sócio A', quotas: 585900, valor: 585900 },
        },
      ]);

      expect(itens).toHaveLength(2);
      expect((itens[0].socio as Record<string, string>).ordem).toBe('1');
      expect((itens[1].socio as Record<string, string>).ordem).toBe('2');
      // Sem matrícula, {{#imoveis}} sai vazia e {{#aportes}} carrega a cláusula.
      expect(itens[0].imoveis as ItemLista[]).toEqual([]);
      const alineas = itens[0].aportes as ItemLista[];
      expect(alineas).toHaveLength(1);
      expect(alineas[0].seQuotas).toBe(true);
      expect(alineas[0].seImovel).toBe(false);
      expect(aporte(itens[0], 0).alinea).toBe('a');
      expect(aporte(itens[0], 0).quotas).toBe('585.900');
      const origem = alineas[0].origem as Record<string, string>;
      expect(origem.razaoSocial).toBe('Farroupilha Comércio Ltda');
      expect(origem.cnpj).toBe('11.111.111/0001-11');
      expect(origem.representante).toBe('Sócio A');
    });

    it('sócio sem imóvel não desloca a ordem de quem tem', () => {
      const soMoeda = socioIntegralizante('x', 'Sócio Capitalista');
      const itens = mapearIntegralizacoes([soMoeda, jose, maria], matriculas, [
        { id: 'mov-1', pessoaId: 'x', quotas: 1000, valor: 1000, forma: 'moeda' },
      ]);
      expect(itens).toHaveLength(3);
      expect(itens.map((i) => (i.socio as Record<string, string>).ordemRomana)).toEqual(['i', 'ii', 'iii']);
      // A referência cruzada continua apontando para o item certo do array.
      expect((itens[2].imoveis as ItemLista[])[0].refItem).toBe(itens[1]);
    });

    it('mantém a identidade dos itens de imóvel, e com ela a referência cruzada', () => {
      const [pJose, pMaria] = mapearIntegralizacoes([jose, maria], matriculas, []);
      expect((pMaria.aportes as ItemLista[])[0]).toBe((pMaria.imoveis as ItemLista[])[0]);
      expect((pMaria.aportes as ItemLista[])[0].refItem).toBe(pJose);
    });
  });
});

describe('calcularParticipacoesPR — quadro derivado da empresa PR', () => {
  function matPR(
    id: string,
    vlr: number | null,
    titulares: TitularParaMapear[],
  ): MatriculaIntegralizacao {
    return {
      id, numero: id, livro: null, folha: null,
      municipio_imovel: null, uf_imovel: null,
      area_documento: null, area_unidade: null, vlr_contabil: vlr,
      confrontacoes_texto: null, descricao_psa_completa: null,
      bem: null, cartorio: null, titulares,
    };
  }

  const meio = (pessoaId: string, denominacao: string): TitularParaMapear =>
    ({ pessoaId, denominacao, fracao: 50 });

  it('titular único sem fração leva 100% da matrícula, e o valor segue as quotas (B6)', () => {
    const [p] = calcularParticipacoesPR([
      matPR('m1', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ]);
    expect(p.denominacao).toBe('José Eduardo');
    expect(p.quotas).toBe(558414);
    // Os quarenta e cinco centavos do rateio bruto não somem nem viram capital
    // com centavos: o valor integralizado é o das quotas.
    expect(p.valor).toBe(558414);
    expect(p.percentual).toBe(100);
  });

  it('50/50 com centavo ímpar: o último absorve, e a linha da tabela fecha com o capital', () => {
    const [a, b] = calcularParticipacoesPR([
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
    ]);
    // Ordenado por valor desc: José (primeiro do rateio) leva a quota a mais.
    expect(a.denominacao).toBe('José Eduardo');
    expect(b.denominacao).toBe('Maria Auxiliadora');
    expect(a.quotas).toBe(69014);
    expect(b.quotas).toBe(69013);
    expect(a.quotas + b.quotas).toBe(138027);
    // Σ valor === capital: nenhuma linha contradiz a cláusula quinta.
    expect(a.valor + b.valor).toBe(138027);
  });

  it('agrega a mesma pessoa através de várias matrículas', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ]);
    expect(participacoes).toHaveLength(2);
    const jose = participacoes.find((p) => p.pessoaId === 'j')!;
    expect(jose.quotas).toBe(683414); // 125.000 + 558.413,55 → quotas inteiras
    expect(jose.valor).toBe(683414);
  });

  it('deduplica posse de fato + de direito da mesma pessoa na matrícula', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', 100000, [
        { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
        { pessoaId: 'j', denominacao: 'José Eduardo', fracao: 50 },
        { pessoaId: 'm', denominacao: 'Maria Auxiliadora', fracao: 50 },
      ]),
    ]);
    expect(participacoes).toHaveLength(2);
    expect(participacoes[0].valor).toBe(50000);
    expect(participacoes[1].valor).toBe(50000);
  });

  it('matrícula sem valor (nem no bem) fica fora do cálculo', () => {
    const participacoes = calcularParticipacoesPR([
      matPR('m1', null, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
      matPR('m2', 100, [{ pessoaId: 'm', denominacao: 'Maria Auxiliadora' }]),
    ]);
    expect(participacoes).toHaveLength(1);
    expect(participacoes[0].denominacao).toBe('Maria Auxiliadora');
  });

  it('propaga tipoPessoa/cpfCnpj do titular enriquecido', () => {
    const [p] = calcularParticipacoesPR([
      matPR('m1', 100, [{
        pessoaId: 'j', denominacao: 'José Eduardo',
        tipoPessoa: 'PF', cpfCnpj: '111.222.333-44',
      }]),
    ]);
    expect(p.tipoPessoa).toBe('PF');
    expect(p.cpfCnpj).toBe('111.222.333-44');
  });

  it('invariantes: Σ valor = capital, Σ quotas = totalQuotas, coerência com calcularCapitalSociedade', () => {
    const matriculas = [
      matPR('m1', 250000, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m2', 138027.21, [meio('j', 'José Eduardo'), meio('m', 'Maria Auxiliadora')]),
      matPR('m3', 558413.55, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ];
    const participacoes = calcularParticipacoesPR(matriculas);
    const capitalEsperado = calcularCapitalSociedade(
      { tipo_empresa: 'PR' } as unknown as PessoaRow,
      [],
      matriculas,
    );

    const somaCent = participacoes.reduce((s, p) => s + Math.round(p.valor * 100), 0);
    expect(somaCent).toBe(Math.round(capitalEsperado.capitalValor! * 100));
    expect(participacoes.reduce((s, p) => s + p.quotas, 0)).toBe(capitalEsperado.totalQuotas);
    expect(participacoes.reduce((s, p) => s + p.percentual, 0)).toBeCloseTo(100, 9);
  });

  it('sem matrículas (ou sem valores) ⇒ []', () => {
    expect(calcularParticipacoesPR([])).toEqual([]);
    expect(calcularParticipacoesPR([
      matPR('m1', null, [{ pessoaId: 'j', denominacao: 'José Eduardo' }]),
    ])).toEqual([]);
  });
});

describe('mapearPartesSelecionadas — N pessoas escolhidas a dedo (seção {{#partes}})', () => {
  const parte = (id: string, denominacao: string, tipo: 'PF' | 'PJ' = 'PF') => ({
    id,
    campos: mapearPessoa({ id, denominacao, tipo_pessoa: tipo, genero: 'M' } as unknown as PessoaRow),
  });
  const nomes = (itens: ItemLista[]) => itens.map((i) => (i.parte as Campos).nome);

  it('cada item sai como { parte: … } com ordem e ordem romana', () => {
    const itens = mapearPartesSelecionadas([parte('p1', 'Ana'), parte('p2', 'Bruno')]);
    expect(nomes(itens)).toEqual(['Ana', 'Bruno']);
    expect(itens.map((i) => (i.parte as Campos).ordem)).toEqual(['1', '2']);
    expect(itens.map((i) => (i.parte as Campos).ordemRomana)).toEqual(['i', 'ii']);
  });

  it('marca sePF/sePJ — a parte pode ser física ou jurídica', () => {
    const itens = mapearPartesSelecionadas([parte('p1', 'Agro Ltda', 'PJ'), parte('p2', 'Bruno')]);
    expect(itens.map((i) => [i.sePF, i.sePJ])).toEqual([[false, true], [true, false]]);
    // A qualificação da PJ e a da PF saem do mesmo vocabulário `pessoa`: o campo
    // opcional que a PJ não tem publica '' e a guarda do bloco pula o trecho.
    expect((itens[0].parte as Campos).profissao).toBe('');
  });

  it('preserva a proveniência da pessoa (valor clicável na prévia)', () => {
    const [item] = mapearPartesSelecionadas([parte('p1', 'Ana')]);
    expect(origemDe(item.parte as Campos)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('ordena por quotas na empresa, da maior para a menor', () => {
    const itens = mapearPartesSelecionadas(
      [parte('p1', 'Ana'), parte('p2', 'Bruno'), parte('p3', 'Carla')],
      new Map([['p1', 10], ['p2', 500], ['p3', 100]]),
    );
    expect(nomes(itens)).toEqual(['Bruno', 'Carla', 'Ana']);
    // A numeração acompanha a ordem resolvida, não a de entrada.
    expect(itens.map((i) => (i.parte as Campos).ordem)).toEqual(['1', '2', '3']);
  });

  it('empate em quotas resolve por ordem alfabética', () => {
    const itens = mapearPartesSelecionadas(
      [parte('p1', 'Carla'), parte('p2', 'Ana'), parte('p3', 'Bruno')],
      new Map([['p1', 100], ['p2', 100], ['p3', 100]]),
    );
    expect(nomes(itens)).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('parte sem quota vem depois de todas as que têm, e entre si em ordem alfabética', () => {
    const itens = mapearPartesSelecionadas(
      [parte('p1', 'Ana'), parte('p2', 'Bruno'), parte('p3', 'Carla'), parte('p4', 'Daniel')],
      // Ana e Daniel não são sócios: são o outorgado e a testemunha nominada.
      new Map([['p2', 1], ['p3', 999]]),
    );
    expect(nomes(itens)).toEqual(['Carla', 'Bruno', 'Ana', 'Daniel']);
  });

  it('mapa de quotas vazio (sem empresa, ou empresa sem quadro) é ordem alfabética', () => {
    const itens = mapearPartesSelecionadas([
      parte('p1', 'Carla'), parte('p2', 'Ana'), parte('p3', 'Bruno'),
    ]);
    expect(nomes(itens)).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('acento não joga o nome para o fim da lista (locale pt-BR)', () => {
    const itens = mapearPartesSelecionadas([
      parte('p1', 'Zuleica'), parte('p2', 'Ávila'), parte('p3', 'Bento'),
    ]);
    expect(nomes(itens)).toEqual(['Ávila', 'Bento', 'Zuleica']);
  });

  it('a ordem é do resolvedor: permutar a entrada não muda a saída', () => {
    const quotas = new Map([['p2', 100], ['p3', 100], ['p4', 7]]);
    const todas = [parte('p1', 'Ana'), parte('p2', 'Bruno'), parte('p3', 'Álvaro'), parte('p4', 'Diego')];
    const primeira = mapearPartesSelecionadas(todas, quotas);
    const outra = mapearPartesSelecionadas([...todas].reverse(), quotas);
    expect(nomes(primeira)).toEqual(['Álvaro', 'Bruno', 'Diego', 'Ana']);
    expect(nomes(outra)).toEqual(nomes(primeira));
  });

  it('homônimos com as mesmas quotas saem em ordem estável (a id desempata)', () => {
    const quotas = new Map([['p1', 5], ['p2', 5]]);
    const um = mapearPartesSelecionadas([parte('p2', 'Ana'), parte('p1', 'Ana')], quotas);
    const outro = mapearPartesSelecionadas([parte('p1', 'Ana'), parte('p2', 'Ana')], quotas);
    const ids = (itens: ItemLista[]) => itens.map((i) => origemDe(i.parte as Campos)?.id);
    expect(ids(um)).toEqual(['p1', 'p2']);
    expect(ids(outro)).toEqual(ids(um));
  });

  it('sem seleção, a lista é vazia (a chave existe no contexto, o laço não entra)', () => {
    expect(mapearPartesSelecionadas([], new Map())).toEqual([]);
  });
});

describe('proveniência (origem) anexada pelos mapeadores', () => {
  const ana = { id: 'p1', denominacao: 'Ana', tipo_pessoa: 'PF', genero: 'F' } as unknown as PessoaRow;

  it('mapearPessoa anexa { tipo: pessoa, id da linha }', () => {
    expect(origemDe(mapearPessoa(ana))).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearSociedade anexa { tipo: sociedade, id da empresa }', () => {
    const pj = { id: 'e1', denominacao: 'Agro Ltda', tipo_pessoa: 'PJ' } as unknown as PessoaRow;
    expect(origemDe(mapearSociedade(pj))).toEqual({ tipo: 'sociedade', id: 'e1' });
  });

  it('a origem sobrevive a derivarCampos e à edição manual (spread)', () => {
    const campos = mapearPessoa(ana);
    const editado = derivarCampos('pessoa', { ...campos, nome: 'Ana Maria' });
    expect(origemDe(editado)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearSocio e mapearAdministrador preservam a origem da pessoa', () => {
    const s = mapearSocio({ pessoa: ana, quotas: 10, vlr_total: 10, representante: null });
    expect(origemDe(s.socio)).toEqual({ tipo: 'pessoa', id: 'p1' });

    const a = mapearAdministrador({ pessoa: ana, cargo: 'Diretora' });
    expect(origemDe(a.administrador)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('mapearIntegralizacoes preserva a origem no escopo socio de cada parágrafo', () => {
    const m: MatriculaIntegralizacao = {
      ...matriculaCom([{ denominacao: 'Ana', pessoaId: 'p1', fracao: 100 }]),
      id: 'm1',
      vlr_contabil: 1000,
    };
    const [item] = mapearIntegralizacoes(
      [{ pessoa: ana, quotas: null, vlr_total: null, representante: null }],
      [m],
    );
    expect(origemDe(item.socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
    // E o imóvel da alínea aponta para a matrícula de origem.
    const [imovel] = item.imoveis as ItemLista[];
    expect(origemDe(imovel.imovel)).toEqual({ tipo: 'matricula', id: 'm1' });
  });

  it('mapearBem anexa { tipo: bem, id da linha }', () => {
    const bem = {
      id: 'b1', denominacao: 'Fazenda Santa Fé', referencia_dp: 'DP-01',
      tipo_bem: 'IR', vlr_contabil: 1000, ccir_codigo: null, inscricao_municipal: null,
    } as unknown as Parameters<typeof mapearBem>[0];
    expect(origemDe(mapearBem(bem))).toEqual({ tipo: 'bem', id: 'b1' });
  });

  it('mapearMatricula anexa a origem quando há id; sem id (dado legado) fica sem', () => {
    const com = mapearMatricula({ ...matriculaCom([]), id: 'm1' });
    expect(origemDe(com)).toEqual({ tipo: 'matricula', id: 'm1' });

    const sem = mapearMatricula(matriculaCom([]));
    expect(origemDe(sem)).toBeUndefined();
  });
});
