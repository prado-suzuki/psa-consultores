import { describe, expect, it } from 'vitest';

import { explicaRecusaDoBanco, mensagemDeRepetido } from '@/hooks/useDomainPapelDeTrabalho';

/*
 * Só as mensagens de recusa, que são funções puras. O resto do arquivo é
 * consulta ao Supabase e se prova rodando, não em teste de unidade.
 *
 * O que estes casos prendem é o caminho da revisão DESCARTADA. Ele escapava das
 * duas conferências amigáveis, ia bater na `unique (estudo_id, checksum)` e
 * voltava como `duplicate key value violates unique constraint` num toast
 * vermelho, sem dizer o que houve nem o que fazer.
 */
describe('mensagens de recusa da importação', () => {
  it('aponta a revisão quando o arquivo repetido está na lista', () => {
    const texto = mensagemDeRepetido(2, false);

    expect(texto).toContain('na revisão 2');
    expect(texto).toContain('altere a planilha');
    expect(texto).not.toContain('descartada');
  });

  it('explica que descartar não libera o arquivo', () => {
    const texto = mensagemDeRepetido(3, true);

    expect(texto).toContain('na revisão 3');
    expect(texto).toContain('descartada');
    expect(texto).toContain('não libera o arquivo');
  });

  it('traduz a violação da unique, que é o que sobra para quem não é admin', () => {
    const texto = explicaRecusaDoBanco({
      code: '23505',
      message: 'duplicate key value violates unique constraint "wp_importacao_checksum_unico"',
    });

    expect(texto).not.toContain('duplicate key');
    expect(texto).toContain('já foi importado neste estudo');
    expect(texto).toContain('descartada');
  });

  it('preserva o texto de qualquer outra recusa do banco', () => {
    expect(explicaRecusaDoBanco({ code: '42501', message: 'permissão negada' })).toBe(
      'permissão negada',
    );
    expect(explicaRecusaDoBanco({})).toContain('Não consegui gravar');
  });
});
