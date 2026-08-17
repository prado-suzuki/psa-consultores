import { describe, expect, it } from 'vitest';

import { montarComprovante, type DocumentoDoComprovante } from './comprovanteRecebimento';

// Data fixa: é o que torna o teste determinístico e o motivo pelo qual a função
// pura recebe a emissão por parâmetro em vez de ler o relógio.
const EMITIDO = new Date(2026, 7, 17, 9, 30);

// Espalha `over` POR CIMA do padrão, e não `over.x ?? padrao`: com `??` um
// `created_by: null` explícito seria trocado pelo padrão e o caso de autor nulo
// nunca seria exercitado. Foi o que aconteceu na primeira versão deste arquivo.
function doc(over: Partial<DocumentoDoComprovante> = {}): DocumentoDoComprovante {
  return {
    id: 'd1',
    nome_original: 'contrato.pdf',
    categoria: 'societarios',
    fonte: 'cliente',
    excluido: false,
    created_at: '2026-08-10T12:00:00Z',
    created_by: 'u1',
    ...over,
  };
}

const base = {
  clienteNome: 'Grupo Aurora',
  nomesPorUsuario: { u1: 'Marta Campos', u2: 'Rafael Campos' },
  emitidoEm: EMITIDO,
};

describe('montarComprovante', () => {
  it('lista vazia devolve total zero e nenhum grupo', () => {
    const m = montarComprovante({ ...base, documentos: [] });
    expect(m.total).toBe(0);
    expect(m.grupos).toEqual([]);
    expect(m.clienteNome).toBe('Grupo Aurora');
  });

  it('documento produzido pela casa fica fora', () => {
    const m = montarComprovante({
      ...base,
      documentos: [doc({ id: 'a', fonte: 'cliente' }), doc({ id: 'b', fonte: 'psa' })],
    });
    expect(m.total).toBe(1);
    expect(m.grupos.flatMap((g) => g.itens)).toHaveLength(1);
  });

  it('documento arquivado fica fora', () => {
    const m = montarComprovante({
      ...base,
      documentos: [doc({ id: 'a' }), doc({ id: 'b', fonte: 'arquivar' })],
    });
    expect(m.total).toBe(1);
  });

  it('documento excluído fica fora', () => {
    const m = montarComprovante({
      ...base,
      documentos: [doc({ id: 'a' }), doc({ id: 'b', excluido: true })],
    });
    expect(m.total).toBe(1);
  });

  it('ordena dentro do grupo por data de chegada crescente, ao contrário da tela', () => {
    const m = montarComprovante({
      ...base,
      documentos: [
        doc({ id: 'c', nome_original: 'terceiro.pdf', created_at: '2026-08-12T10:00:00Z' }),
        doc({ id: 'a', nome_original: 'primeiro.pdf', created_at: '2026-08-10T10:00:00Z' }),
        doc({ id: 'b', nome_original: 'segundo.pdf', created_at: '2026-08-11T10:00:00Z' }),
      ],
    });
    expect(m.grupos[0].itens.map((i) => i.arquivo)).toEqual([
      'primeiro.pdf', 'segundo.pdf', 'terceiro.pdf',
    ]);
    expect(m.grupos[0].itens.map((i) => i.ordem)).toEqual([1, 2, 3]);
  });

  it('empate de data é resolvido pelo id, para a ordem não depender do banco', () => {
    const mesmaHora = '2026-08-10T10:00:00Z';
    const m = montarComprovante({
      ...base,
      documentos: [
        doc({ id: 'b2', nome_original: 'b.pdf', created_at: mesmaHora }),
        doc({ id: 'a1', nome_original: 'a.pdf', created_at: mesmaHora }),
      ],
    });
    expect(m.grupos[0].itens.map((i) => i.arquivo)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('quem enviou cai para travessão quando o autor é nulo', () => {
    const m = montarComprovante({ ...base, documentos: [doc({ created_by: null })] });
    expect(m.grupos[0].itens[0].enviadoPor).toBe('—');
  });

  it('quem enviou cai para travessão quando o mapa não resolve o nome', () => {
    // Caso real: created_by não tem chave estrangeira, então usuário removido
    // não volta da RPC de nomes.
    const m = montarComprovante({ ...base, documentos: [doc({ created_by: 'u-removido' })] });
    expect(m.grupos[0].itens[0].enviadoPor).toBe('—');
  });

  it('data de chegada ausente vira travessão e o item vai para o fim', () => {
    const m = montarComprovante({
      ...base,
      documentos: [
        doc({ id: 'sem', nome_original: 'sem-data.pdf', created_at: null }),
        doc({ id: 'com', nome_original: 'com-data.pdf', created_at: '2026-08-10T10:00:00Z' }),
      ],
    });
    expect(m.grupos[0].itens.map((i) => i.arquivo)).toEqual(['com-data.pdf', 'sem-data.pdf']);
    expect(m.grupos[0].itens[1].recebidoEm).toBe('—');
  });

  it('nome de arquivo vazio vira travessão', () => {
    const m = montarComprovante({ ...base, documentos: [doc({ nome_original: '   ' })] });
    expect(m.grupos[0].itens[0].arquivo).toBe('—');
  });

  it('agrupa nos quatro grupos canônicos e mantém a ordem deles', () => {
    const m = montarComprovante({
      ...base,
      documentos: [
        doc({ id: 'o', categoria: 'outros' }),
        doc({ id: 'b', categoria: 'agrarios' }),
        doc({ id: 'j', categoria: 'societarios' }),
        doc({ id: 'f', categoria: 'pessoais' }),
      ],
    });
    expect(m.grupos.map((g) => g.key)).toEqual(['pf', 'pj', 'bens_imoveis', 'outros']);
    expect(m.total).toBe(4);
  });

  it('grupo sem item não aparece', () => {
    const m = montarComprovante({ ...base, documentos: [doc({ categoria: 'pessoais' })] });
    expect(m.grupos).toHaveLength(1);
    expect(m.grupos[0].key).toBe('pf');
  });

  it('formata a emissão como dd/mm/aaaa às hh:mm', () => {
    const m = montarComprovante({ ...base, documentos: [] });
    expect(m.emitidoEm).toBe('17/08/2026 às 09:30');
  });

  it('sem solicitação, as datas dela saem vazias para o documento não exibir', () => {
    const m = montarComprovante({ ...base, documentos: [] });
    expect(m.solicitacaoEnviadaEm).toBe('');
    expect(m.solicitacaoEncerradaEm).toBe('');
  });

  it('com solicitação, formata envio e encerramento e aceita encerramento nulo', () => {
    const m = montarComprovante({
      ...base,
      documentos: [],
      solicitacao: { enviadaEm: '2026-08-05T14:00:00Z', encerradaEm: null },
    });
    expect(m.solicitacaoEnviadaEm).toMatch(/^05\/08\/2026 às /);
    expect(m.solicitacaoEncerradaEm).toBe('—');
  });
});
