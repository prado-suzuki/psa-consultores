import { describe, expect, it } from 'vitest';
import { isImagemAnexo, nomeDoPrintColado, primeiraImagemColada } from '@/lib/anexosEntregavel';

describe('anexosEntregavel', () => {
  it('reconhece imagem pelo mime e, na falta dele, pela extensão', () => {
    expect(isImagemAnexo('image/png', 'print.png')).toBe(true);
    expect(isImagemAnexo(null, 'foto.JPEG')).toBe(true);
    expect(isImagemAnexo(null, 'planilha.xlsx')).toBe(false);
    expect(isImagemAnexo('application/pdf', 'contrato.pdf')).toBe(false);
    expect(isImagemAnexo(null, 'sem_extensao')).toBe(false);
  });

  it('pega a primeira imagem colada e ignora o que não é imagem', () => {
    const texto = new File([''], 'nota.txt', { type: 'text/plain' });
    const png = new File([''], 'image.png', { type: 'image/png' });
    const jpg = new File([''], 'outra.jpg', { type: 'image/jpeg' });

    expect(primeiraImagemColada([texto, png, jpg])).toBe(png);
    expect(primeiraImagemColada([texto])).toBeNull();
    expect(primeiraImagemColada([])).toBeNull();
  });

  it('carimba a data no nome do print colado, com extensão vinda do mime', () => {
    const agora = new Date('2026-07-29T13:45:07.000Z');

    expect(nomeDoPrintColado(new File([''], 'image.png', { type: 'image/png' }), agora)).toBe(
      'print 2026-07-29 13-45-07.png',
    );
    expect(nomeDoPrintColado(new File([''], 'image.jpg', { type: 'image/jpeg' }), agora)).toBe(
      'print 2026-07-29 13-45-07.jpg',
    );
    // sem mime, cai na extensão do nome
    expect(nomeDoPrintColado(new File([''], 'captura.PNG', { type: '' }), agora)).toBe(
      'print 2026-07-29 13-45-07.png',
    );
  });
});
