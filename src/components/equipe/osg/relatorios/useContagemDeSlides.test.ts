// O número que a Biblioteca promete antes do clique.
//
// Ele mentiu: devolvia `2` fixo para a societária, e um cliente com 41 sócios
// recebia 7 slides. A aritmética da paginação está presa em
// `_shared/apresentacao-osg/paginacao.test.ts`; o que falta prender é a tradução
// daqui — somar o organograma, medir SÓCIO por empresa (e não empresa), e manter o
// zero quando não há o que gerar.
//
// O teste da tela (`BibliotecaApresentacoes.test.tsx`) mocka este hook inteiro,
// então sem este arquivo estas três decisões não têm rede nenhuma.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const bens = vi.hoisted(() => ({ atual: [] as unknown[] }));
const empresas = vi.hoisted(() => ({ atual: [] as unknown[] }));

vi.mock('@/hooks/useRelatorioDP', () => ({
  useRelatorioDP: () => ({ data: bens.atual, isLoading: false }),
}));
vi.mock('@/hooks/useRelatorioSocietario', () => ({
  useRelatorioSocietario: () => ({ data: empresas.atual, isLoading: false }),
}));

import { useContagemDeSlides } from './useContagemDeSlides';

/** Uma empresa do quadro: para a contagem, só o número de sócios importa. */
const empresa = (socios: number) => ({
  socios: Array.from({ length: socios }, (_, i) => ({ pessoaId: `p${i}` })),
});

/** Um bem do diagnóstico patrimonial, no mínimo que a regra lê. Imóvel rural por padrão. */
const bem = (destino: string | null, participa = true, tipo_bem = 'IR') => ({
  empresa_destino_pessoa_id: destino,
  participa_estruturacao: participa,
  tipo_bem,
});

function contar(
  quadro: ReturnType<typeof empresa>[],
  patrimonio: ReturnType<typeof bem>[] = [],
) {
  empresas.atual = quadro;
  bens.atual = patrimonio;
  return renderHook(() => useContagemDeSlides('cliente-1')).result.current;
}

describe('useContagemDeSlides — societária', () => {
  it('conta as páginas do quadro, e não uma só: o Banana Quântica dá 5', () => {
    // 42 sócios numa empresa e 1 na outra = 4 páginas de quadro + o organograma.
    // Conferido contra o .pptx: 7 slides no arquivo, 2 deles capa e divisor.
    // ANTES DESTA CORREÇÃO A TELA DIZIA 2.
    expect(contar([empresa(42), empresa(1)]).societaria).toBe(5);
  });

  it('quadro pequeno continua em 2 — o organograma mais uma página', () => {
    // O Agro Aliança e a Sta. Terezinha, os dois casos normais do sandbox. O
    // número que a tela já mostrava estava certo para eles, e tem de continuar.
    expect(contar([empresa(3), empresa(1), empresa(1)]).societaria).toBe(2);
    expect(contar([empresa(2), empresa(2)]).societaria).toBe(2);
  });

  it('sem empresa é zero, e não 1 pelo organograma', () => {
    // O gerador desenha o organograma mesmo assim, mas esta contagem responde
    // "tem o que gerar?" — e a tela usa o zero para dizer que não tem.
    expect(contar([]).societaria).toBe(0);
  });

  it('mede sócio, não empresa: muitas empresas pequenas cabem numa página', () => {
    // A armadilha da versão antiga era achar que empresa = página. São duas
    // colunas de 13 linhas, então seis empresas de 1 sócio ainda são uma página.
    expect(contar(Array.from({ length: 6 }, () => empresa(1))).societaria).toBe(2);
  });
});

describe('useContagemDeSlides — patrimonial', () => {
  it('um slide por sociedade de destino distinta', () => {
    expect(contar([], [bem('e1'), bem('e2'), bem('e1')]).patrimonial).toBe(2);
  });

  it('bem fora da estruturação não vira slide', () => {
    // A `gerar-apresentacao` descarta `participa_estruturacao = false` antes de
    // agrupar, então um destino que só aparece em bem descartado não conta.
    expect(contar([], [bem('e1'), bem('e2', false)]).patrimonial).toBe(1);
  });

  it('bem sem destino agrupa num slide só', () => {
    expect(contar([], [bem(null), bem(null)]).patrimonial).toBe(1);
  });

  it('o que não é imóvel sai da página da sociedade e conta na tabela de outros bens', () => {
    // A moeda sem destino não abre página de sociedade: vai para a tabela de outros bens (9 por página).
    expect(contar([], [bem('e1'), bem(null, true, 'OU')]).patrimonial).toBe(2);
    expect(contar([], [bem('e1'), bem('e1', true, 'PS'), bem('e2', true, 'OU')]).patrimonial).toBe(2);
    expect(contar([], [bem('e1'), ...Array.from({ length: 10 }, () => bem('e1', true, 'OU'))]).patrimonial).toBe(3);
    expect(contar([], [bem('e1'), bem('e1', false, 'OU')]).patrimonial).toBe(1);
  });
});
