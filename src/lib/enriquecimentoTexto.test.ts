import { describe, expect, it } from 'vitest';

import {
  CAPACIDADES_RICAS_BASICAS,
  CAPACIDADES_RICAS_TAREFA,
  converterRespostaEnriquecimento,
  markdownEnriquecidoParaDoc,
  sugestaoAindaSeAplica,
} from '@/lib/enriquecimentoTexto';

describe('markdownEnriquecidoParaDoc', () => {
  it('converte apenas as marcas básicas permitidas', () => {
    const doc = markdownEnriquecidoParaDoc(
      '**forte**, *ênfase*, ++sublinhado++ e `código`',
      CAPACIDADES_RICAS_BASICAS,
    );
    const marks = doc.content?.[0].content?.map((no) => no.marks?.[0]?.type ?? null);

    expect(marks).toEqual(['bold', null, 'italic', null, 'underline', null, null]);
    expect(JSON.stringify(doc)).not.toContain('"type":"code"');
  });

  it('preserva código somente para campos de tarefa', () => {
    const doc = markdownEnriquecidoParaDoc(
      '`campo`\n\n```sql\nselect 1;\n```',
      CAPACIDADES_RICAS_TAREFA,
    );

    expect(JSON.stringify(doc)).toContain('"type":"code"');
    expect(doc.content?.[1]).toMatchObject({
      type: 'codeBlock',
      attrs: { language: 'sql' },
    });
  });

  it('transforma bloco não suportado em texto comum', () => {
    const doc = markdownEnriquecidoParaDoc('```sql\nselect 1;\n```');
    expect(doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'select 1;' }] },
    ]);
  });
});

describe('converterRespostaEnriquecimento', () => {
  it('converte cada campo conforme seu próprio destino', () => {
    const sugestao = converterRespostaEnriquecimento('comentário original', {
      estruturado: true,
      campos: {
        titulo: {
          valor: { tipo: 'texto', texto: 'Revisar contrato' },
          destino: 'simples',
        },
        descricao: {
          valor: { tipo: 'texto', texto: '**Contexto:** contrato.' },
          destino: 'rico',
        },
      },
    });

    expect(sugestao).toMatchObject({
      estruturado: true,
      origem: 'comentário original',
      campos: {
        titulo: { conteudo: 'Revisar contrato' },
        descricao: { conteudo: { type: 'doc' } },
      },
    });
  });

  it('campo anulável vira texto vazio e campo numérico vira o literal', () => {
    const sugestao = converterRespostaEnriquecimento('origem', {
      estruturado: true,
      campos: {
        responsavel_mencionado: {
          valor: { tipo: 'texto', texto: null },
          destino: 'simples',
        },
        horas_estimadas: {
          valor: { tipo: 'numero', numero: 4 },
          destino: 'simples',
        },
      },
    });

    if (!sugestao.estruturado) throw new Error('esperava sugestão estruturada');
    expect(sugestao.campos.responsavel_mencionado.conteudo).toBe('');
    expect(sugestao.campos.horas_estimadas.conteudo).toBe('4');
  });

  it('só permite aplicar a sugestão enquanto a origem continua igual', () => {
    const sugestao = converterRespostaEnriquecimento('texto inicial ', {
      estruturado: false,
      texto: 'Texto inicial.',
      destino: 'simples',
    });

    expect(sugestaoAindaSeAplica(sugestao, 'texto inicial ')).toBe(true);
    expect(sugestaoAindaSeAplica(sugestao, 'texto alterado')).toBe(false);
  });
});
