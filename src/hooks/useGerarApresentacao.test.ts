// A geração dos decks da OSG não tinha teste nenhum quando virou mutation. O que
// se confere aqui é o contrato: o que ela devolve, o que ela baixa e o que ela
// audita.
//
// EM 21/09/2026 O CONTRATO MUDOU: a geração passou a persistir, então o servidor
// devolve URL assinada e id da apresentação em vez de bytes em base64. Os casos
// abaixo acompanharam — e dois deles existem só por causa dessa mudança: link que
// não foi assinado e download que falha depois de o arquivo estar gravado.
//
// USA QueryClient DE VERDADE, e não o mock de `@tanstack/react-query` que outros
// testes do repo fazem: o que se quer verificar aqui é justamente a mutation — se
// o `useMutation` fosse mockado, o teste passaria a exercitar o mock.
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.hoisted(() => vi.fn());
const logAction = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke } },
}));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction, logActionOrThrow: vi.fn() }),
}));

import { useGerarApresentacao } from '@/hooks/useGerarApresentacao';

const CLIENTE = 'cli-1';

function montar(clienteId: string | null = CLIENTE) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useGerarApresentacao(clienteId), { wrapper });
}

/** Um deck como a Edge Function devolve: gravado, versionado e com URL assinada. */
const deck = (tipo: 'patrimonial' | 'societaria', versao = 1) => ({
  tipo,
  nome: `PSA_${tipo}_v${versao}.pptx`,
  url: `https://storage.exemplo/${tipo}?assinada`,
  apresentacaoId: `ap-${tipo}`,
  versao,
});

describe('useGerarApresentacao', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // O download roda de verdade: sem estes dois, o jsdom quebra no object URL.
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    // `baixarArquivoPorUrl` BUSCA os bytes antes de clicar no link local, então
    // agora o download depende de fetch — o que também o torna falhável.
    global.fetch = vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['pptx']) }) as never;
  });

  it('sem cliente escolhido, nem chama o servidor', async () => {
    const { result } = montar(null);
    const r = await result.current.mutateAsync(['patrimonial', 'societaria']);

    expect(r).toEqual({ arquivos: [], erro: 'nenhum cliente selecionado' });
    expect(invoke).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });

  it('devolve os dois decks, baixa cada um e audita UM POR DECK', async () => {
    invoke.mockResolvedValue({
      data: { arquivos: [deck('patrimonial'), deck('societaria')] },
      error: null,
    });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial', 'societaria']);

    expect(invoke).toHaveBeenCalledWith('gerar-apresentacao', {
      body: { clienteId: CLIENTE, tipos: ['patrimonial', 'societaria'] },
    });
    expect(r.erro).toBeNull();
    expect(r.arquivos).toEqual([
      { tipo: 'patrimonial', nome: 'PSA_patrimonial_v1.pptx', apresentacaoId: 'ap-patrimonial', versao: 1 },
      { tipo: 'societaria', nome: 'PSA_societaria_v1.pptx', apresentacaoId: 'ap-societaria', versao: 1 },
    ]);
    // um fetch e um object URL por arquivo — é o que garante que os dois baixaram
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

    // A URL assinada NÃO volta para quem chamou: ela é de vida curta e o download
    // já aconteceu aqui dentro. Guardá-la na tela convidaria a reusar link morto.
    expect(r.arquivos[0]).not.toHaveProperty('url');
    expect(r.errosPorDeck).toEqual([]);

    /*
     * DUAS chamadas de auditoria, uma por deck, cada uma apontando para a própria
     * apresentação. Era uma só, com `entity_id` = cliente, quando não havia id
     * para apontar — e aí não dava para responder "de onde veio este arquivo".
     */
    await waitFor(() => expect(logAction).toHaveBeenCalledTimes(2));
    expect(logAction).toHaveBeenNthCalledWith(1, expect.objectContaining({
      area: 'osg',
      entity_type: 'apresentacao_osg',
      entity_id: 'ap-patrimonial',
      entity_name: 'PSA_patrimonial_v1.pptx',
      action: 'created',
    }));
    expect(logAction).toHaveBeenNthCalledWith(2, expect.objectContaining({
      entity_id: 'ap-societaria',
      entity_name: 'PSA_societaria_v1.pptx',
    }));
  });

  it('link não assinado não vira sucesso calado: o arquivo ficou, o download não', async () => {
    // A casca grava a linha ANTES de subir o arquivo e só então assina a URL. Se a
    // assinatura falhar, o registro existe e o arquivo existe — o que falta é o
    // link, e é isso que a tela precisa ouvir, em vez de "gerado" sem nada baixar.
    invoke.mockResolvedValue({
      data: { arquivos: [{ ...deck('patrimonial'), url: null }] },
      error: null,
    });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial']);

    expect(r.erro).toBeNull();
    expect(r.arquivos).toHaveLength(1);
    expect(r.errosPorDeck).toEqual([
      { tipo: 'patrimonial', message: 'a apresentação ficou guardada, mas o link para baixar não veio' },
    ]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('link expirado entra como falha do deck, e a geração segue valendo', async () => {
    // O `baixarArquivoPorUrl` lança quando a resposta não é ok. O arquivo está
    // gravado e versionado, então derrubar o resultado inteiro seria mentir sobre
    // o que aconteceu: a tela pode oferecer o mesmo arquivo de novo.
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as never;
    invoke.mockResolvedValue({ data: { arquivos: [deck('societaria', 3)] }, error: null });
    const { result } = montar();
    const r = await result.current.mutateAsync(['societaria']);

    expect(r.erro).toBeNull();
    expect(r.errosPorDeck).toEqual([
      { tipo: 'societaria', message: 'O link do arquivo expirou. Tente de novo.' },
    ]);
    // Auditou de qualquer forma: o deck EXISTE no banco, com a versão 3.
    await waitFor(() => expect(logAction).toHaveBeenCalledTimes(1));
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ entity_id: 'ap-societaria', details: expect.stringContaining('v3') }),
    );
  });

  // O servidor já mandava `erros` por deck e passou a mandar `problemas` de
  // cadastro. O hook descartava os dois; o deck saía faltando coisa em silêncio.
  it('carrega os problemas de cadastro e o erro por deck que o servidor devolve', async () => {
    invoke.mockResolvedValue({
      data: {
        arquivos: [deck('patrimonial')],
        erros: [{ tipo: 'societaria', message: 'Template ausente: TEMPLATE_CAP02_SOCIETARIA.pptx' }],
        problemas: [
          { tipo: 'origem', detalhe: '"Fazenda X" ficou fora do quadro societario.' },
        ],
      },
      error: null,
    });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial', 'societaria']);

    expect(r.erro).toBeNull();
    expect(r.problemas).toEqual([
      { tipo: 'origem', detalhe: '"Fazenda X" ficou fora do quadro societario.' },
    ]);
    expect(r.errosPorDeck).toEqual([
      { tipo: 'societaria', message: 'Template ausente: TEMPLATE_CAP02_SOCIETARIA.pptx' },
    ]);
  });

  it('sem problemas nem erros, os dois vêm listas vazias e não undefined', async () => {
    invoke.mockResolvedValue({ data: { arquivos: [deck('patrimonial')] }, error: null });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial']);

    expect(r.problemas).toEqual([]);
    expect(r.errosPorDeck).toEqual([]);
  });

  it('404 do invoke vira "ainda não está publicada", que é outra conversa', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 404 }, message: 'x' } });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial']);

    expect(r.erro).toBe('a geração ainda não está publicada no servidor');
    expect(r.arquivos).toEqual([]);
    expect(logAction).not.toHaveBeenCalled();
  });

  it('resposta vazia é erro, e não sucesso silencioso', async () => {
    invoke.mockResolvedValue({ data: { arquivos: [] }, error: null });
    const { result } = montar();
    const r = await result.current.mutateAsync(['patrimonial', 'societaria']);

    expect(r.erro).toBe('o servidor não devolveu nenhum arquivo');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(logAction).not.toHaveBeenCalled();
  });
});
