import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
const dbMocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: dbMocks.from, auth: { getUser: dbMocks.getUser } },
}));

import { mockSupabaseChain } from '@/test/supabaseMock';
import { useBlocos, type BlocoComVersao } from '@/hooks/useBibliotecaModelos';

/** Linha crua de tmpl_bloco como a consulta a devolve (com os embeds). */
const linha = (over: Record<string, unknown>) => ({
  id: 'x',
  nome: 'Bloco',
  tipo: 'paragrafo',
  categoria: null,
  descricao: null,
  ativo: true,
  repete_colecao: null,
  ancora: null,
  bloco_origem_id: null,
  familia_id: null,
  variante_seletor: null,
  variante_rotulo: null,
  variante_ordem: null,
  tmpl_bloco_versao: [],
  tmpl_bloco_flag: [],
  ...over,
});

const versoes = (conteudo: string) => [
  { id: 'v-old', conteudo: 'antigo', numero_versao: 1, atual: false },
  { id: 'v-new', conteudo, numero_versao: 2, atual: true },
];

// Fixtures na convenção da família que está no banco (supabase/migrations/
// 20260806140000_seed_familia_descricao_imovel.sql): cabeça 'Descrição de imóvel'
// sem versão/flag/repete_colecao, variantes 'livre' com nome prefixado, e a ordem 1
// é a de direitos de escritura não averbada.
// Divergência deliberada do seed: o helper `versoes()` devolve DUAS versões (v1
// rebaixada e v2 atual), enquanto no banco cada variante está só em v1. É assim
// para provar que o hook escolhe pela flag `atual` e não pela primeira linha.
const LINHAS = [
  linha({ id: 'normal', nome: 'Cláusula solta', tmpl_bloco_versao: versoes('texto solto') }),
  linha({
    id: 'cabeca',
    nome: 'Descrição de imóvel',
    categoria: 'capital',
    descricao: 'Família de variantes: uma redação por caso de imóvel.',
  }),
  // De propósito fora de ordem: quem ordena é o hook, por variante_ordem.
  linha({
    id: 'var-urbano-inteiro',
    nome: 'Descrição de imóvel: Urbano, propriedade exclusiva',
    tipo: 'livre',
    categoria: 'capital',
    familia_id: 'cabeca',
    variante_rotulo: 'Urbano, propriedade exclusiva',
    variante_seletor: { 'imovel.urbano': 'sim', 'imovel.inteiro': 'sim' },
    variante_ordem: 4,
  }),
  linha({
    id: 'var-posse',
    nome: 'Descrição de imóvel: Direitos de escritura não averbada',
    tipo: 'livre',
    categoria: 'capital',
    familia_id: 'cabeca',
    variante_rotulo: 'Direitos de escritura não averbada',
    variante_seletor: { 'imovel.posse': 'sim' },
    variante_ordem: 1,
    tmpl_bloco_versao: versoes('imóvel rural de posse, direitos de promessa de compra'),
    tmpl_bloco_flag: [{ flag_id: 'flag-1' }],
  }),
  linha({
    id: 'var-rural-inteiro',
    nome: 'Descrição de imóvel: Rural, propriedade exclusiva',
    tipo: 'livre',
    categoria: 'capital',
    familia_id: 'cabeca',
    variante_rotulo: 'Rural, propriedade exclusiva',
    variante_seletor: { 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' },
    variante_ordem: 2,
  }),
  // Cabeça ausente da consulta (não deveria acontecer, o FK é cascade): a variante
  // não pode vazar como carta solta com redação parcial.
  linha({ id: 'orfa', nome: 'Órfã', familia_id: 'inexistente', variante_seletor: {}, variante_ordem: 10 }),
];

const rodarQueryFn = async () => {
  const chain = mockSupabaseChain({ data: LINHAS, error: null });
  dbMocks.from.mockReturnValue(chain);
  const { result } = renderHook(() => useBlocos());
  const options = result.current as unknown as { queryFn: () => Promise<BlocoComVersao[]> };
  return { blocos: await options.queryFn(), chain };
};

describe('useBlocos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém o recorte de blocos canônicos (derivados de override fora)', async () => {
    const { chain } = await rodarQueryFn();
    expect(chain.is).toHaveBeenCalledWith('bloco_origem_id', null);
  });

  it('não devolve variante como bloco solto', async () => {
    const { blocos } = await rodarQueryFn();
    expect(blocos.map((b) => b.id)).toEqual(['normal', 'cabeca']);
  });

  it('aninha as variantes na cabeça, em ordem de avaliação', async () => {
    const { blocos } = await rodarQueryFn();
    const cabeca = blocos.find((b) => b.id === 'cabeca')!;

    expect(cabeca.variantes.map((v) => v.id)).toEqual(['var-posse', 'var-rural-inteiro', 'var-urbano-inteiro']);
    expect(cabeca.variantes.map((v) => v.variante_rotulo)).toEqual([
      'Direitos de escritura não averbada',
      'Rural, propriedade exclusiva',
      'Urbano, propriedade exclusiva',
    ]);
    expect(cabeca.variantes[0].variante_seletor).toEqual({ 'imovel.posse': 'sim' });
    // Variante é bloco de verdade: versão atual e flags próprias.
    expect(cabeca.variantes[0].versao_atual?.conteudo).toBe('imóvel rural de posse, direitos de promessa de compra');
    expect(cabeca.variantes[0].flag_ids).toEqual(['flag-1']);
    // Variante sem versão publicada não quebra a agregação.
    expect(cabeca.variantes[1].versao_atual).toBeNull();
  });

  it('bloco normal continua sem variantes', async () => {
    const { blocos } = await rodarQueryFn();
    const normal = blocos.find((b) => b.id === 'normal')!;

    expect(normal.variantes).toEqual([]);
    expect(normal.familia_id).toBeNull();
    expect(normal.versao_atual?.conteudo).toBe('texto solto');
  });
});
