import { describe, it, expect } from 'vitest';
import { avaliarTravaDoIngresso, type MovimentoParaIngresso } from './travaDoIngresso';

const PR = 'empresa-pr';
const OUTRA = 'empresa-outra';

const NOMES = new Map([
  ['lucas', 'Lucas Andrade'],
  ['marina', 'Marina Alves'],
  ['heitor', 'Heitor Bueno'],
  ['jatoba', 'Jatobá Sementes S.A.'],
]);

let seq = 0;
const mov = (m: Partial<MovimentoParaIngresso>): MovimentoParaIngresso => ({
  empresaPessoaId: PR,
  origemPessoaId: null,
  destinoPessoaId: null,
  quotas: 100,
  documentoGeradoId: `doc-${(seq += 1)}`,
  ...m,
});

/** Aporte de constituição, já carimbado pelo registro do contrato social. */
const constituicao = (pessoaId: string, quotas = 100) =>
  mov({ destinoPessoaId: pessoaId, quotas });

/** Entrada pendente: o movimento que peça nenhuma narrou ainda. */
const entradaPendente = (pessoaId: string, quotas = 50) =>
  mov({ destinoPessoaId: pessoaId, quotas, documentoGeradoId: null });

describe('avaliarTravaDoIngresso', () => {
  it('libera quando não há movimento pendente nenhum (a primeira concentração)', () => {
    const trava = avaliarTravaDoIngresso(
      [constituicao('lucas'), constituicao('marina'), constituicao('heitor')],
      PR,
      NOMES,
    );
    expect(trava).toEqual({ liberado: true, entrantes: [], motivo: null });
  });

  it('libera o quadro vazio: não há livro, não há ingresso', () => {
    expect(avaliarTravaDoIngresso([], PR, NOMES).liberado).toBe(true);
  });

  it('trava e NOMEIA quem entrou por movimento ainda não registrado', () => {
    const trava = avaliarTravaDoIngresso(
      [constituicao('lucas'), entradaPendente('marina')],
      PR,
      NOMES,
    );
    expect(trava.liberado).toBe(false);
    expect(trava.entrantes).toEqual(['Marina Alves']);
    expect(trava.motivo).toContain('Marina Alves');
    expect(trava.motivo).toContain('alteração contratual');
  });

  it('nomeia os dois quando dois entraram, e não repete quem tem dois lançamentos', () => {
    const trava = avaliarTravaDoIngresso(
      [
        constituicao('lucas'),
        entradaPendente('marina'),
        entradaPendente('marina'),
        entradaPendente('heitor'),
      ],
      PR,
      NOMES,
    );
    expect(trava.entrantes).toEqual(['Marina Alves', 'Heitor Bueno']);
    expect(trava.motivo).toContain('Marina Alves e Heitor Bueno');
  });

  it('NÃO trava o sócio que já estava no quadro por peça registrada e só aumentou', () => {
    const trava = avaliarTravaDoIngresso(
      [constituicao('lucas'), constituicao('marina'), entradaPendente('lucas')],
      PR,
      NOMES,
    );
    expect(trava).toEqual({ liberado: true, entrantes: [], motivo: null });
  });

  it('trava o sócio que voltou ao quadro: o aumento depois da concentração registrada', () => {
    // O caso do passo 11 da demonstração. Lucas entrou na constituição e saiu
    // na concentração, as duas coisas já registradas: o saldo formalizado dele
    // é zero, e o aporte do aumento é uma entrada nova, que a AC2 ainda não
    // narrou. Depois do registro dela (passo 14) o mesmo livro libera.
    const livro = [
      constituicao('lucas', 300),
      mov({ origemPessoaId: 'lucas', destinoPessoaId: 'jatoba', quotas: 300 }),
      entradaPendente('lucas', 120),
    ];
    expect(avaliarTravaDoIngresso(livro, PR, NOMES).entrantes).toEqual(['Lucas Andrade']);

    const carimbado = livro.map((m) => ({ ...m, documentoGeradoId: m.documentoGeradoId ?? 'ac2' }));
    expect(avaliarTravaDoIngresso(carimbado, PR, NOMES).liberado).toBe(true);
  });

  it('a saída formalizada não vira ingresso: quem cede não é adquirente', () => {
    const trava = avaliarTravaDoIngresso(
      [
        constituicao('lucas'),
        mov({ origemPessoaId: 'lucas', destinoPessoaId: 'jatoba', quotas: 100, documentoGeradoId: null }),
      ],
      PR,
      NOMES,
    );
    // A Jatobá é adquirente pendente e sem saldo formalizado: ela é o ingresso.
    expect(trava.entrantes).toEqual(['Jatobá Sementes S.A.']);
  });

  it('não confunde empresas: ingresso pendente em OUTRA sociedade não trava esta', () => {
    const trava = avaliarTravaDoIngresso(
      [
        constituicao('lucas'),
        mov({ empresaPessoaId: OUTRA, destinoPessoaId: 'marina', documentoGeradoId: null }),
      ],
      PR,
      NOMES,
    );
    expect(trava.liberado).toBe(true);
  });

  it('não olha o saldo formalizado da OUTRA empresa para liberar esta', () => {
    const trava = avaliarTravaDoIngresso(
      [
        mov({ empresaPessoaId: OUTRA, destinoPessoaId: 'marina', quotas: 500 }),
        entradaPendente('marina'),
      ],
      PR,
      NOMES,
    );
    expect(trava.entrantes).toEqual(['Marina Alves']);
  });

  it('não quebra a frase quando a pessoa não tem nome resolvido', () => {
    const trava = avaliarTravaDoIngresso([entradaPendente('fantasma')], PR, NOMES);
    expect(trava.entrantes).toEqual(['sócio sem nome cadastrado']);
    expect(trava.motivo).toBeTruthy();
  });
});
