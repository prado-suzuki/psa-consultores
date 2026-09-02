import { describe, it, expect } from 'vitest';
import {
  avaliarFluxoDaSociedade,
  declararPeca,
  nomeDaPeca,
  type FatosDaPeca,
} from './estadoDaSociedade';

const JATOBA = { pessoaId: 'empresa-cn', denominacao: 'Jatobá Sementes S.A.' };

const fatos = (p: Partial<FatosDaPeca> = {}): FatosDaPeca => ({
  sociedade: JATOBA,
  ehSocietario: true,
  statusDaPeca: null,
  papelDaPeca: null,
  constitutivosRegistrados: new Set<string>(),
  sucessorDaBase: null,
  alteracaoEmCurso: false,
  temBaseRegistrada: false,
  erroDeComposicao: null,
  ...p,
});

const fluxo = (p: Partial<FatosDaPeca> = {}) => avaliarFluxoDaSociedade(fatos(p));

describe('avaliarFluxoDaSociedade: o estado da peça da vez', () => {
  it('sem peça nenhuma, a próxima a nascer é a constituição', () => {
    expect(fluxo().estado).toBe('sem-peca');
  });

  it('rascunho responde pelo papel carimbado, e não pelo que está em cena', () => {
    expect(fluxo({ statusDaPeca: 'rascunho', papelDaPeca: 'constitutivo' }).estado).toBe(
      'constitutivo-em-rascunho',
    );
    expect(fluxo({ statusDaPeca: 'rascunho', papelDaPeca: 'alterador' }).estado).toBe(
      'alteracao-em-rascunho',
    );
  });

  it('registrada, e sucedida quando outra peça já a substituiu', () => {
    expect(fluxo({ statusDaPeca: 'registrado' }).estado).toBe('registrada');
    expect(
      fluxo({ statusDaPeca: 'registrado', sucessorDaBase: { status: 'rascunho' } }).estado,
    ).toBe('sucedida');
  });

  it('respondido o assistente, a tela deixa de ser a da registrada', () => {
    expect(fluxo({ statusDaPeca: 'registrado', alteracaoEmCurso: true }).estado).toBe(
      'alteracao-em-composicao',
    );
  });

  it('modelo de escopo avulso não tem vida societária', () => {
    expect(fluxo({ ehSocietario: false }).estado).toBe('peca-avulsa');
  });
});

describe('avaliarFluxoDaSociedade: validar', () => {
  it('libera enquanto a sociedade não foi constituída', () => {
    expect(fluxo().travas.validar.liberado).toBe(true);
  });

  it('trava quando a sociedade já tem constitutivo registrado, e nomeia ela', () => {
    const trava = fluxo({ constitutivosRegistrados: new Set(['empresa-cn']) }).travas.validar;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('Jatobá Sementes S.A. já foi constituída');
  });

  it('trava sobre peça registrada: ali validar criaria uma linhagem nova', () => {
    expect(fluxo({ statusDaPeca: 'registrado' }).travas.validar.liberado).toBe(false);
  });

  it('NÃO trava a alteração em curso: ela nasce alterador, e é o caminho certo', () => {
    const trava = fluxo({
      statusDaPeca: 'registrado',
      alteracaoEmCurso: true,
      // A sociedade já constituída é justamente a premissa da alteração.
      constitutivosRegistrados: new Set(['empresa-cn']),
    }).travas.validar;
    expect(trava.liberado).toBe(true);
  });

  it('mas trava a SEGUNDA alteração sobre a mesma peça base', () => {
    const trava = fluxo({
      statusDaPeca: 'registrado',
      alteracaoEmCurso: true,
      sucessorDaBase: { status: 'rascunho' },
    }).travas.validar;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('já tem uma alteração contratual');
  });

  it('NÃO trava a head em rascunho: validar ali atualiza a linhagem que já existe', () => {
    const trava = fluxo({
      statusDaPeca: 'rascunho',
      papelDaPeca: 'alterador',
      constitutivosRegistrados: new Set(['empresa-cn']),
      sucessorDaBase: null,
    }).travas.validar;
    expect(trava.liberado).toBe(true);
  });

  it('erro de composição fecha o gesto que de outro modo estaria aberto', () => {
    const trava = fluxo({ erroDeComposicao: 'Placeholder não resolvido' }).travas.validar;
    expect(trava.liberado).toBe(false);
    expect(trava.titulo).toBe('A folha está em erro de composição');
    expect(trava.motivo).toContain('Conserte antes de validar');
  });

  it('mas a razão de ORDEM vence o erro: sobre peça registrada, consertar não destravaria', () => {
    const trava = fluxo({
      statusDaPeca: 'registrado',
      constitutivosRegistrados: new Set(['empresa-cn']),
      erroDeComposicao: 'Seção não resolvida: {{#aportes}}',
    }).travas.validar;
    expect(trava.titulo).toBe('A sociedade já foi constituída');
    expect(trava.motivo).not.toContain('Conserte antes de validar');
  });
});

describe('avaliarFluxoDaSociedade: registrar', () => {
  it('libera o rascunho constitutivo da sociedade que ainda não foi à junta', () => {
    expect(
      fluxo({ statusDaPeca: 'rascunho', papelDaPeca: 'constitutivo' }).travas.registrar.liberado,
    ).toBe(true);
  });

  it('trava o SEGUNDO constitutivo da mesma sociedade', () => {
    const trava = fluxo({
      statusDaPeca: 'rascunho',
      papelDaPeca: 'constitutivo',
      constitutivosRegistrados: new Set(['empresa-cn']),
    }).travas.registrar;
    expect(trava.liberado).toBe(false);
    expect(trava.titulo).toBe('A sociedade já foi constituída');
  });

  it('a alteração em rascunho registra mesmo com a sociedade já constituída', () => {
    expect(
      fluxo({
        statusDaPeca: 'rascunho',
        papelDaPeca: 'alterador',
        constitutivosRegistrados: new Set(['empresa-cn']),
      }).travas.registrar.liberado,
    ).toBe(true);
  });

  it('trava o que não está em rascunho: registrar duas vezes não é gesto', () => {
    expect(fluxo({ statusDaPeca: 'registrado' }).travas.registrar.liberado).toBe(false);
  });

  it('trava a peça avulsa: a junta registra ato de sociedade', () => {
    const trava = fluxo({ ehSocietario: false, statusDaPeca: 'rascunho' }).travas.registrar;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('escopo avulso');
  });
});

describe('avaliarFluxoDaSociedade: gerar alteração', () => {
  it('libera sobre a peça registrada', () => {
    expect(
      fluxo({ statusDaPeca: 'registrado', temBaseRegistrada: true }).travas.gerarAlteracao.liberado,
    ).toBe(true);
  });

  it('libera para REVER os eventos da alteração já validada, cuja base é a registrada', () => {
    const trava = fluxo({
      statusDaPeca: 'rascunho',
      papelDaPeca: 'alterador',
      temBaseRegistrada: true,
    }).travas.gerarAlteracao;
    expect(trava.liberado).toBe(true);
  });

  it('trava quando a peça já foi sucedida', () => {
    const trava = fluxo({
      statusDaPeca: 'registrado',
      temBaseRegistrada: true,
      sucessorDaBase: { status: 'registrado' },
    }).travas.gerarAlteracao;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('já foi substituída');
  });

  it('trava antes de haver peça registrada: a alteração sucede alguém', () => {
    const trava = fluxo({ statusDaPeca: 'rascunho', papelDaPeca: 'constitutivo' }).travas
      .gerarAlteracao;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('Registre o contrato social');
  });

  it('erro de composição NÃO fecha o assistente: ele não sela nada', () => {
    expect(
      fluxo({
        statusDaPeca: 'registrado',
        temBaseRegistrada: true,
        erroDeComposicao: 'Placeholder não resolvido',
      }).travas.gerarAlteracao.liberado,
    ).toBe(true);
  });
});

describe('avaliarFluxoDaSociedade: atualizar do cadastro', () => {
  it('só existe sobre rascunho; sobre peça registrada, a peça não se reescreve', () => {
    expect(fluxo({ statusDaPeca: 'rascunho' }).travas.atualizarDoCadastro.liberado).toBe(true);
    expect(fluxo({ statusDaPeca: 'registrado' }).travas.atualizarDoCadastro.liberado).toBe(false);
  });

  it('trava com folha em erro, como validar e registrar', () => {
    const trava = fluxo({ statusDaPeca: 'rascunho', erroDeComposicao: 'Âncora órfã' }).travas
      .atualizarDoCadastro;
    expect(trava.liberado).toBe(false);
    expect(trava.motivo).toContain('Conserte antes de atualizar');
  });
});

describe('declararPeca: a folha diz onde você está', () => {
  it('nomeia a peça pela posição na sucessão', () => {
    expect(nomeDaPeca(0)).toBe('Contrato social');
    expect(nomeDaPeca(2)).toBe('2ª alteração');
  });

  it('declara peça, situação e quantos atos pendentes ela formaliza', () => {
    const d = declararPeca('alteracao-em-rascunho', { numeroAlteracao: 1, atosAFormalizar: 2 });
    expect(d?.linha).toBe('1ª alteração · rascunho · formalizando 2 atos pendentes');
  });

  it('concorda no singular', () => {
    const d = declararPeca('alteracao-em-composicao', { numeroAlteracao: 1, atosAFormalizar: 1 });
    expect(d?.linha).toBe('1ª alteração · em composição, ainda não validada · formalizando 1 ato pendente');
  });

  it('sem ato pendente, a linha não fala de ato nenhum', () => {
    const d = declararPeca('constitutivo-em-rascunho', { numeroAlteracao: 0, atosAFormalizar: 0 });
    expect(d?.linha).toBe('Contrato social · rascunho');
  });

  it('a peça registrada não está formalizando nada: já formalizou', () => {
    const d = declararPeca('registrada', { numeroAlteracao: 1, atosAFormalizar: 3 });
    expect(d?.linha).toBe('1ª alteração · registrada na junta');
    expect(d?.atos).toBe(0);
  });

  it('a peça avulsa não declara vida societária', () => {
    expect(declararPeca('peca-avulsa', { numeroAlteracao: 0, atosAFormalizar: 0 })).toBeNull();
  });
});
