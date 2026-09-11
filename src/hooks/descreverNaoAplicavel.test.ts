import { describe, expect, it } from 'vitest';

import { descreverNaoAplicavel } from '@/hooks/useDomainSolicitacaoNaoAplicavel';

/**
 * O aviso de "não se aplica" nasceu em 10/09/2026: até então a marca gravava (ou
 * falhava) em silêncio absoluto, e a ficha ficava igual nos dois casos.
 *
 * A regra que estes testes protegem é a de que a frase descreve o que o BANCO
 * gravou, e não o que o clique pediu — a gravação é uma sincronização, e o
 * conjunto pedido pode já ser o conjunto salvo.
 */

const NOMES = { 'item-cpf': 'CPF', 'item-rg': 'RG' };

describe('descreverNaoAplicavel', () => {
  /**
   * Uma linha, com o nome do documento. A semântica ("sai da conta", "as outras
   * entidades continuam com ele") é o tooltip do botão, que aparece antes do
   * clique; depois dele a linha já está riscada na tela.
   */
  it('marcar um documento cabe no título, sem descrição', () => {
    const aviso = descreverNaoAplicavel({ marcados: ['item-cpf'], desmarcados: [] }, NOMES);
    expect(aviso?.title).toBe('"CPF" não se aplica a esta entidade');
    expect(aviso?.description).toBeUndefined();
  });

  it('desmarcar diz que o documento volta a ser solicitado', () => {
    const aviso = descreverNaoAplicavel({ marcados: [], desmarcados: ['item-rg'] }, NOMES);
    expect(aviso?.title).toBe('"RG" volta a ser solicitado');
    expect(aviso?.description).toBeUndefined();
  });

  /**
   * O caminho do modal de vínculo, que sincroniza o conjunto inteiro de uma vez.
   * Nomear documento a documento aí viraria uma frase ilegível.
   */
  it('mexer em vários vira contagem, não lista de nomes', () => {
    const aviso = descreverNaoAplicavel(
      { marcados: ['item-cpf', 'item-rg'], desmarcados: ['item-x'] }, NOMES,
    );
    expect(aviso?.title).toBe('Documentos atualizados');
    expect(aviso?.description).toBe('Nesta entidade: 2 marcados como não se aplica e 1 de volta à solicitação.');
  });

  it('só marcados, em quantidade, não inventa a outra metade da frase', () => {
    const aviso = descreverNaoAplicavel({ marcados: ['a', 'b'], desmarcados: [] }, {});
    expect(aviso?.description).toBe('Nesta entidade: 2 marcados como não se aplica.');
  });

  /**
   * Sincronizar o conjunto que já estava gravado não muda nada, e avisar "pronto"
   * sobre coisa nenhuma treina o analista a ignorar o aviso.
   */
  it('nada mudou não vira aviso', () => {
    expect(descreverNaoAplicavel({ marcados: [], desmarcados: [] }, NOMES)).toBeNull();
  });

  it('item sem nome no mapa não quebra a frase', () => {
    const aviso = descreverNaoAplicavel({ marcados: ['item-sem-nome'], desmarcados: [] }, NOMES);
    expect(aviso?.title).toBe('"O documento" não se aplica a esta entidade');
  });
});
