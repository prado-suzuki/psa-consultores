import { describe, expect, it } from 'vitest';
import {
  nomeDoZip, nomesUnicosNoZip, sanitizarNomeDeArquivo, slugDePasta,
} from '@/lib/downloadEmLote';

describe('sanitizarNomeDeArquivo', () => {
  it('troca o que criaria pasta ou quebraria no Windows', () => {
    expect(sanitizarNomeDeArquivo('contrato 1/2.pdf')).toBe('contrato 1-2.pdf');
    expect(sanitizarNomeDeArquivo('a:b*c?d"e<f>g|h.pdf')).toBe('a-b-c-d-e-f-g-h.pdf');
  });

  it('mantém acento e espaço, que são legítimos', () => {
    expect(sanitizarNomeDeArquivo('Certidão de Óbito.pdf')).toBe('Certidão de Óbito.pdf');
  });

  it('nome que sobra vazio vira "documento"', () => {
    expect(sanitizarNomeDeArquivo('   ')).toBe('documento');
  });
});

describe('nomesUnicosNoZip', () => {
  it('preserva a ordem e não mexe no que já é único', () => {
    expect(nomesUnicosNoZip(['a.pdf', 'b.pdf'])).toEqual(['a.pdf', 'b.pdf']);
  });

  it('numera a repetição a partir da segunda, antes da extensão', () => {
    expect(nomesUnicosNoZip(['RG.pdf', 'RG.pdf', 'RG.pdf'])).toEqual([
      'RG.pdf', 'RG (2).pdf', 'RG (3).pdf',
    ]);
  });

  it('trata caixa diferente como colisão (Windows e macOS tratam)', () => {
    expect(nomesUnicosNoZip(['RG.pdf', 'rg.pdf'])).toEqual(['RG.pdf', 'rg (2).pdf']);
  });

  it('não gera colisão nova quando o nome numerado já existe', () => {
    expect(nomesUnicosNoZip(['RG.pdf', 'RG (2).pdf', 'RG.pdf'])).toEqual([
      'RG.pdf', 'RG (2).pdf', 'RG (3).pdf',
    ]);
  });

  it('nome sem extensão recebe o número no fim', () => {
    expect(nomesUnicosNoZip(['anexo', 'anexo'])).toEqual(['anexo', 'anexo (2)']);
  });

  it('sanitiza antes de comparar: dois nomes viram o mesmo e desempatam', () => {
    expect(nomesUnicosNoZip(['a/b.pdf', 'a:b.pdf'])).toEqual(['a-b.pdf', 'a-b (2).pdf']);
  });
});

describe('slugDePasta', () => {
  it('tira acento, caixa e pontuação', () => {
    expect(slugDePasta('Pessoas Físicas')).toBe('pessoas-fisicas');
    expect(slugDePasta('Matrícula 12.345')).toBe('matricula-12-345');
  });

  it('rótulo sem nenhuma letra não deixa o nome do arquivo vazio', () => {
    expect(slugDePasta('—')).toBe('documentos');
  });
});

describe('nomeDoZip', () => {
  it('usa a data LOCAL, não a UTC', () => {
    // 22h de 16/09 em Brasília já é 17/09 em UTC; o arquivo tem de dizer 16.
    const quando = new Date(2026, 8, 16, 22, 30);
    expect(nomeDoZip('Todos os documentos', quando)).toBe(
      'documentos-todos-os-documentos-2026-09-16.zip',
    );
  });
});
