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
  modelo: null,
  ...extra,
});

const MODELO = {
  bucket: 'osg-modelos',
  path: 'documento-tipo/dre/Modelo_DRE_Projetada.xlsx',
  nome: 'DRE Projetada (modelo).xlsx',
};

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

    expect(grupos[0].documentos.map((d) => d.nome)).toEqual(['CPF', 'RG / CNH']);
    expect(grupos[1].documentos.map((d) => d.nome)).toEqual(['Contrato social']);
    expect(grupos[2].documentos).toEqual([]);
  });

  it('leva a instrução de cada documento junto com o nome', () => {
    const grupos = montarGruposColeta(
      [item('IRPF', 'pf', { nota: 'Últimos 3 exercícios, com recibo de entrega' })],
      [],
    );

    expect(grupos[0].documentos).toEqual([
      { nome: 'IRPF', instrucao: 'Últimos 3 exercícios, com recibo de entrega', modelo: null },
    ]);
  });

  // Card 4: alguns documentos não são papel que o cliente já tem — são planilhas
  // que a PSA manda em branco. O modelo vem do catálogo, pela RPC.
  it('leva o modelo do documento junto, quando o catálogo tem um', () => {
    const grupos = montarGruposColeta(
      [item('Planilha de resultado projetado', 'outros', { modelo: MODELO })],
      [],
    );

    expect(grupos[3].documentos).toEqual([
      { nome: 'Planilha de resultado projetado', instrucao: null, modelo: MODELO },
    ]);
  });

  it('documento sem modelo fica com modelo nulo, que é o caso comum', () => {
    const grupos = montarGruposColeta([item('CPF', 'pf')], []);

    expect(grupos[0].documentos[0].modelo).toBeNull();
  });

  // A junção de repetidos precisa ser CAMPO A CAMPO. O mesmo documento é pedido
  // uma vez por pessoa, e instrução e modelo podem chegar em ocorrências
  // diferentes: trocar o objeto inteiro perderia o que a outra já tinha.
  it('ao juntar repetidos, herda instrução e modelo de ocorrências diferentes', () => {
    const grupos = montarGruposColeta(
      [
        item('Planilha de áreas', 'bens_imoveis', { modelo: MODELO }),
        item('Planilha de áreas', 'bens_imoveis', { nota: 'Uma linha por fazenda' }),
      ],
      [],
    );

    expect(grupos[2].documentos).toEqual([
      { nome: 'Planilha de áreas', instrucao: 'Uma linha por fazenda', modelo: MODELO },
    ]);
  });

  // O mesmo documento é pedido uma vez por pessoa ou por matrícula. Na gaveta
  // ele aparece uma vez só, e vale a primeira instrução que veio preenchida.
  it('ao juntar repetidos, fica com a primeira instrução preenchida', () => {
    const grupos = montarGruposColeta(
      [
        item('CPF', 'pf'),
        item('CPF', 'pf', { nota: 'De todos os sócios' }),
        item('CPF', 'pf', { nota: 'Ignorada, já tem instrução' }),
      ],
      [],
    );

    expect(grupos[0].documentos).toEqual([
      { nome: 'CPF', instrucao: 'De todos os sócios', modelo: null },
    ]);
  });

  // O motivo da EDU-26: a gaveta é a coluna `grupo`, não mais um palpite sobre o
  // texto de `entidade`. Aqui os dois discordam de propósito, e vale o grupo.
  it('usa a gaveta que o item manda, ignorando o texto de entidade', () => {
    const grupos = montarGruposColeta(
      [item('Matrícula do imóvel', 'bens_imoveis', { entidade: 'Pessoa Física' })],
      [],
    );

    expect(grupos[0].documentos).toEqual([]);
    expect(grupos[2].documentos.map((d) => d.nome)).toEqual(['Matrícula do imóvel']);
  });

  it('item do grupo outros entra na quarta gaveta', () => {
    const grupos = montarGruposColeta([item('Nota fiscal do trator', 'outros')], []);

    expect(grupos[3].documentos.map((d) => d.nome)).toEqual(['Nota fiscal do trator']);
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
