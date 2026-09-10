import { describe, expect, it } from 'vitest';
import { faltandoNoMarco, linhasRegistradas, marcoPreenchido } from '@/lib/osg/registrosDaSociedade';
import type { PecaRegistrada, RegistroContratual } from '@/hooks/useDocumentoGerado';

const marco = (extra: Partial<RegistroContratual> = {}): RegistroContratual => ({
  versao: 1, confirmacaoId: 'conf-1', ...extra,
});

const peca = (id: string, sobre: Partial<PecaRegistrada> = {}): PecaRegistrada => ({
  id,
  papel: 'alterador',
  createdAt: '2026-09-01T12:00:00Z',
  substituiDocumentoId: null,
  registro: marco(),
  ...sobre,
});

describe('registrosDaSociedade', () => {
  it('nomeia a cadeia pela sucessão, da constituição à última alteração', () => {
    // Chegam fora de ordem de propósito: a ordem é a da cadeia, não a da consulta.
    const linhas = linhasRegistradas([
      peca('ac2', { substituiDocumentoId: 'ac1' }),
      peca('constituicao', { papel: 'constitutivo' }),
      peca('ac1', { substituiDocumentoId: 'constituicao' }),
    ]);

    expect(linhas.map((l) => [l.documentoId, l.titulo])).toEqual([
      ['constituicao', 'Constituição'],
      ['ac1', '1ª alteração'],
      ['ac2', '2ª alteração'],
    ]);
  });

  it('peça cujo antecessor não está na lista continua alcançável', () => {
    // É justamente nela que pode faltar dado: registro antigo, sem papel
    // carimbado e apontando para peça que não veio na consulta.
    const linhas = linhasRegistradas([
      peca('orfa', { papel: null, substituiDocumentoId: 'fora-da-lista' }),
    ]);

    // Continua na lista, e contando o elo que dá para contar: ela substitui
    // alguma peça, mesmo que a base não tenha vindo na consulta.
    expect(linhas).toHaveLength(1);
    expect(linhas[0].titulo).toBe('1ª alteração');
  });

  it('dado torto com ciclo não trava a conta', () => {
    const linhas = linhasRegistradas([
      peca('a', { substituiDocumentoId: 'b' }),
      peca('b', { substituiDocumentoId: 'a' }),
    ]);

    expect(linhas.map((l) => l.documentoId).sort()).toEqual(['a', 'b']);
  });

  it('lista o que falta no marco, na ordem do formulário', () => {
    expect(faltandoNoMarco(marco({ protocolo: 'MTP-1', juntaUf: 'MT', junta: 'JUCEMT' }))).toEqual([
      'Data do registro', 'Número do arquivamento', 'PDF registrado',
    ]);
  });

  it('marco completo não falta nada; marco ausente falta tudo', () => {
    const completo = marco({
      arquivoId: 'arq-1', protocolo: 'MTP-1', numeroArquivamento: '512',
      dataRegistro: '2026-08-10', juntaUf: 'MT', junta: 'JUCEMT',
    });
    expect(faltandoNoMarco(completo)).toEqual([]);
    expect(faltandoNoMarco(null)).toHaveLength(6);
    // Espaço em branco não é dado preenchido.
    expect(faltandoNoMarco(marco({ protocolo: '   ' }))).toContain('Protocolo na junta');
  });

  it('o marco gravado omite o que está em branco e normaliza a UF', () => {
    expect(marcoPreenchido({
      protocolo: ' MTP-1 ', numeroArquivamento: '', dataRegistro: '2026-08-10',
      juntaUf: 'mt', junta: '   ', arquivoId: undefined,
    })).toEqual({ protocolo: 'MTP-1', dataRegistro: '2026-08-10', juntaUf: 'MT' });
    // Nada preenchido é marco vazio, e é assim que se registra sem o marco.
    expect(marcoPreenchido({})).toEqual({});
  });
});
