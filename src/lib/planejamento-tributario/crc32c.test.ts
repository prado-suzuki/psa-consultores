// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { crc32c, crc32cBase64 } from '@/lib/planejamento-tributario/crc32c';

/**
 * Confere o CRC32C contra valores conhecidos.
 *
 * O que precisa ficar preso é o **formato do GCS**, não a matemática: base64 de
 * quatro bytes big-endian. Errar isso faz a conferência prévia nunca achar o
 * arquivo repetido, e o defeito seria silencioso, porque a RPC ainda recusaria e
 * ninguém notaria que a proteção anterior parou de funcionar.
 *
 * Os dois primeiros vetores são os canônicos do CRC32C (RFC 3720, apêndice B).
 */

const bytes = (texto: string) => new TextEncoder().encode(texto);

describe('crc32c', () => {
  /* Vetores da RFC 3720: 32 bytes zerados e a cadeia "123456789". */
  it('bate com os vetores canônicos', () => {
    expect(crc32c(new Uint8Array(32))).toBe(0x8a9136aa);
    expect(crc32c(bytes('123456789'))).toBe(0xe3069283);
  });

  it('entrada vazia é zero', () => {
    expect(crc32c(new Uint8Array(0))).toBe(0);
    expect(crc32cBase64(new Uint8Array(0))).toBe('AAAAAA==');
  });

  /*
   * O formato: quatro bytes big-endian em base64, sempre oito caracteres. É como
   * o GCS publica, e é o que está gravado em `wp_importacao.checksum`.
   */
  it('sai em base64 de quatro bytes, sempre oito caracteres', () => {
    for (const texto of ['', 'a', '123456789', 'papel de trabalho']) {
      expect(crc32cBase64(bytes(texto))).toHaveLength(8);
    }
  });

  it('conteúdo diferente dá checksum diferente', () => {
    expect(crc32cBase64(bytes('WP versão 1'))).not.toBe(crc32cBase64(bytes('WP versão 2')));
  });
});
