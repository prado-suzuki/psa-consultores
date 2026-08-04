import { describe, expect, it } from 'vitest';
import { montarGruposColeta } from '@/lib/coletaDocumentosCliente';
import { GRUPOS_DOCUMENTO, type GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import type { DocumentoArquivoRow, SolicitacaoItemCliente } from '@/hooks/useDocumentoArquivo';

const item = (
  documento: string,
  grupo: GrupoDocumentoKey,
  extra: Partial<SolicitacaoItemCliente> = {},
): SolicitacaoItemCliente => ({
  id: `${grupo}:${documento}`,
  grupo,
  documento,
  nota: null,
  entidade: null,
  ordem: null,
  ...extra,
});

const doc = (
  id: string,
  categoria: string,
  extra: Partial<DocumentoArquivoRow> = {},
): DocumentoArquivoRow =>
  ({
    id,
    categoria,
    fonte: 'cliente',
    checklist_item_id: null,
    nome_original: `${id}.pdf`,
    tamanho: 1000,
    created_at: '2026-07-28T12:00:00Z',
    created_by: null,
    ...extra,
  }) as unknown as DocumentoArquivoRow;

describe('montarGruposColeta', () => {
  it('devolve sempre os 4 grupos, na ordem fixa', () => {
    const grupos = montarGruposColeta([], []);
    expect(grupos.map((g) => g.key)).toEqual(['pf', 'pj', 'bens_imoveis', 'outros']);
    expect(grupos).toHaveLength(GRUPOS_DOCUMENTO.length);
  });

  it('lista os documentos pedidos sem repetir, em ordem alfabética', () => {
    const grupos = montarGruposColeta(
      [
        item('RG / CNH', 'pf'),
        item('CPF', 'pf'),
        item('CPF', 'pf'),
        item('Contrato social', 'pj'),
      ],
      [],
    );

    expect(grupos[0].documentos).toEqual(['CPF', 'RG / CNH']);
    expect(grupos[1].documentos).toEqual(['Contrato social']);
    expect(grupos[2].documentos).toEqual([]);
  });

  // O motivo da EDU-26: a gaveta é a coluna `grupo`, não mais um palpite sobre o
  // texto de `entidade`. Aqui os dois discordam de propósito, e vale o grupo.
  it('usa a gaveta que o item manda, ignorando o texto de entidade', () => {
    const grupos = montarGruposColeta(
      [item('Matrícula do imóvel', 'bens_imoveis', { entidade: 'Pessoa Física' })],
      [],
    );

    expect(grupos[0].documentos).toEqual([]);
    expect(grupos[2].documentos).toEqual(['Matrícula do imóvel']);
  });

  it('item do grupo outros entra na quarta gaveta', () => {
    const grupos = montarGruposColeta([item('Nota fiscal do trator', 'outros')], []);

    expect(grupos[3].documentos).toEqual(['Nota fiscal do trator']);
  });

  it('agrupa os arquivos enviados pela categoria de cada grupo', () => {
    const grupos = montarGruposColeta([], [
      doc('rg', 'pessoais'),
      doc('cpf', 'pessoais'),
      doc('contrato', 'societarios'),
      doc('solto', 'outros'),
    ]);

    expect(grupos[0].arquivos.map((a) => a.id)).toEqual(['rg', 'cpf']);
    expect(grupos[1].arquivos.map((a) => a.id)).toEqual(['contrato']);
    expect(grupos[2].arquivos).toEqual([]);
    expect(grupos[3].arquivos.map((a) => a.id)).toEqual(['solto']);
  });

  it('ignora documento da PSA e documento já vinculado a item de checklist', () => {
    const grupos = montarGruposColeta([], [
      doc('daPsa', 'pessoais', { fonte: 'psa' }),
      doc('vinculado', 'pessoais', { checklist_item_id: 'item-1' }),
      doc('valido', 'pessoais'),
    ]);

    expect(grupos[0].arquivos.map((a) => a.id)).toEqual(['valido']);
  });

  // Antes do agrupador canônico, documento de categoria fora das 4 do cliente
  // não caía em grupo nenhum e sumia da tela. Agora cai no grupo do mapa.
  it('documento de categoria que o cliente não grava cai no grupo do mapa', () => {
    const grupos = montarGruposColeta([], [
      doc('ir', 'declaracao_ir'),
      doc('ccir', 'cadastros_fiscais'),
    ]);

    expect(grupos[0].arquivos.map((a) => a.id)).toEqual(['ir']);
    expect(grupos[2].arquivos.map((a) => a.id)).toEqual(['ccir']);
    expect(grupos.flatMap((g) => g.arquivos)).toHaveLength(2);
  });
});
