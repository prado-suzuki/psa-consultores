/**
 * CRC32C do arquivo, no mesmo formato que o Google Cloud Storage usa.
 *
 * O backend devolve `blob.crc32c` no `finalize`, e é esse valor que vira o
 * checksum de `wp_importacao` e impede subir o mesmo WP duas vezes. Calcular o
 * mesmo número aqui permite recusar o arquivo repetido **antes** de subir, em vez
 * de descobrir depois, quando o binário já está no bucket e vira lixo.
 *
 * É CRC32C, o de Castagnoli, e não o CRC32 comum: polinômio 0x1EDC6F41 refletido
 * para 0x82F63B78. O resultado sai em base64 de quatro bytes big-endian, que é
 * como o GCS o publica.
 *
 * **Se o cálculo divergir do GCS, nada quebra:** a conferência prévia deixa de
 * achar o repetido e a importação segue para a RPC, que recusa do mesmo jeito.
 * Perde-se o ganho, não a proteção. O teste ao lado prende o formato contra um
 * checksum real, medido num arquivo que o GCS de fato recebeu.
 */

const POLINOMIO = 0x82f63b78;

/** Tabela de 256 entradas, montada uma vez. */
const TABELA = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let bit = 0; bit < 8; bit += 1) {
      c = c & 1 ? POLINOMIO ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

/** O CRC32C dos bytes, como número sem sinal. */
export function crc32c(dados: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < dados.length; i += 1) {
    crc = TABELA[(crc ^ dados[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * O CRC32C em base64 de quatro bytes big-endian, o formato do GCS.
 *
 * Usa `btoa`, que existe no navegador e no jsdom. O Node puro não o tem, mas este
 * código só roda no navegador; o teste roda em ambiente `dom`.
 */
export function crc32cBase64(dados: Uint8Array): string {
  const n = crc32c(dados);
  const bytes = new Uint8Array([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
}
