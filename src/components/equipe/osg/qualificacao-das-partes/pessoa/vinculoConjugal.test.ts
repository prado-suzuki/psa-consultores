import { describe, expect, it } from 'vitest';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { conjugesDisponiveis, conjugesOcultosPorVinculo } from './vinculoConjugal';

/**
 * O cenário não é o do teste e2e (um casal só, PF-01/PF-02): são três casais e
 * uma pessoa solteira no mesmo cliente, que é onde o bug aparece de verdade —
 * com um casal só não existe "terceiro já casado" para o select oferecer por
 * engano.
 */
function pessoa(id: string, denominacao: string, conjugeId: string | null = null): PessoaRow {
  return { id, denominacao, conjuge_id: conjugeId, tipo_pessoa: 'PF', cliente_id: 'C1' } as PessoaRow;
}

const ana = pessoa('ANA', 'Ana', 'BRUNO');
const bruno = pessoa('BRUNO', 'Bruno', 'ANA');
const celia = pessoa('CELIA', 'Célia');
const davi = pessoa('DAVI', 'Davi', 'ELISA');
const elisa = pessoa('ELISA', 'Elisa', 'DAVI');
const fabio = pessoa('FABIO', 'Fábio');
const elenco = [ana, bruno, celia, davi, elisa, fabio];

const nomes = (linhas: PessoaRow[]) => linhas.map((linha) => linha.denominacao);

describe('conjugesDisponiveis', () => {
  it('editando Ana, oferece o cônjuge atual e os solteiros, e esconde os casais alheios', () => {
    const disponiveis = conjugesDisponiveis(elenco, { pessoaId: 'ANA', selecionadoId: 'BRUNO' });
    expect(nomes(disponiveis)).toEqual(['Bruno', 'Célia', 'Fábio']);
    expect(conjugesOcultosPorVinculo(elenco, { pessoaId: 'ANA', selecionadoId: 'BRUNO' })).toBe(2);
  });

  it('depois de Ana trocar Bruno por Célia, Bruno volta a ser oferecido a qualquer um', () => {
    // Estado que o gatilho do banco deixa: Bruno liberado, Célia apontando Ana.
    const depois = [
      pessoa('ANA', 'Ana', 'CELIA'), pessoa('BRUNO', 'Bruno'), pessoa('CELIA', 'Célia', 'ANA'),
      davi, elisa, fabio,
    ];
    expect(nomes(conjugesDisponiveis(depois, { pessoaId: 'FABIO' }))).toEqual(['Bruno']);
  });

  it('não oferece quem aponta para um terceiro, mesmo com o vínculo gravado pela metade', () => {
    // Bruno aponta Ana, Ana não aponta ninguém: dado legado, mas Bruno está casado.
    const metade = [pessoa('ANA', 'Ana'), pessoa('BRUNO', 'Bruno', 'ANA'), celia];
    expect(nomes(conjugesDisponiveis(metade, { pessoaId: 'CELIA' }))).toEqual(['Ana']);
  });

  it('mantém quem aponta de volta para a pessoa editada, mesmo sem seleção no formulário', () => {
    // Ana ainda não gravou o cônjuge, mas Bruno já a aponta: ele é o cônjuge dela.
    const metade = [pessoa('BRUNO', 'Bruno', 'ANA'), celia, davi];
    expect(nomes(conjugesDisponiveis(metade, { pessoaId: 'ANA' }))).toEqual(['Bruno', 'Célia']);
  });

  it('em cadastro novo, sem id, oferece apenas quem não tem cônjuge', () => {
    expect(nomes(conjugesDisponiveis(elenco))).toEqual(['Célia', 'Fábio']);
    expect(conjugesOcultosPorVinculo(elenco)).toBe(4);
  });

  it('nunca oferece a própria pessoa, e não a conta como oculta', () => {
    expect(nomes(conjugesDisponiveis(elenco, { pessoaId: 'CELIA' }))).toEqual(['Fábio']);
    expect(conjugesOcultosPorVinculo(elenco, { pessoaId: 'ANA', selecionadoId: 'BRUNO' })).toBe(2);
  });
});
