import { describe, expect, it } from 'vitest';
import { grupoDaEntidade, montarGruposColeta } from '@/lib/coletaDocumentosCliente';
import { GRUPOS_DOCUMENTO } from '@/lib/agrupadorDocumentos';
import type { ChecklistSolicitadoItem, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

const item = (documento: string, entidade: string): ChecklistSolicitadoItem => ({
  item_id: `${entidade}:${documento}`,
  documento,
  entidade,
  categoria: null,
  categoria_docbox: null,
  nota: null,
  confidencial: false,
  rotulo_instancia: null,
  recebido: false,
  arquivo_nome: null,
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

describe('grupoDaEntidade', () => {
  it('mapeia as entidades conhecidas', () => {
    expect(grupoDaEntidade('Pessoa Física')).toBe('pf');
    expect(grupoDaEntidade('Pessoa Jurídica')).toBe('pj');
    expect(grupoDaEntidade('Pessoa Jurídica (Cooperativa)')).toBe('pj');
    expect(grupoDaEntidade('Matrícula (Imóvel Rural)')).toBe('imoveis');
    expect(grupoDaEntidade('Matrícula (Imóvel Urbano)')).toBe('imoveis');
  });

  it('joga bem e entidade desconhecida em outros', () => {
    expect(grupoDaEntidade('Bem')).toBe('outros');
    expect(grupoDaEntidade('Qualquer coisa nova')).toBe('outros');
    expect(grupoDaEntidade('')).toBe('outros');
  });
});

describe('montarGruposColeta', () => {
  it('devolve sempre os 4 grupos, na ordem fixa', () => {
    const grupos = montarGruposColeta([], []);
    expect(grupos.map((g) => g.key)).toEqual(['pf', 'pj', 'imoveis', 'outros']);
    expect(grupos).toHaveLength(GRUPOS_DOCUMENTO.length);
  });

  it('lista os documentos pedidos sem repetir, em ordem alfabética', () => {
    const grupos = montarGruposColeta(
      [
        item('RG / CNH', 'Pessoa Física'),
        item('CPF', 'Pessoa Física'),
        item('CPF', 'Pessoa Física'),
        item('Contrato social', 'Pessoa Jurídica'),
      ],
      [],
    );

    expect(grupos[0].documentos).toEqual(['CPF', 'RG / CNH']);
    expect(grupos[1].documentos).toEqual(['Contrato social']);
    expect(grupos[2].documentos).toEqual([]);
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

  it('itens de Bem entram na lista do grupo Outros', () => {
    const grupos = montarGruposColeta([item('Nota fiscal do trator', 'Bem')], []);

    expect(grupos[3].documentos).toEqual(['Nota fiscal do trator']);
  });
});
