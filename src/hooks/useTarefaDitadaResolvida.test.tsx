import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  projects: [] as { id: string; name: string; external_client_id: string | null }[],
  clients: [] as { id: string; nome: string }[],
  profiles: [] as { id: string; first_name: string; last_name: string }[],
  projectMembers: [] as { user_id: string }[],
  projectMembersArg: undefined as string | undefined,
  loadingProjects: false,
  loadingMembers: false,
}));

vi.mock('@/hooks/useOrgProjects', () => ({
  useOrgProjectsList: () => ({ data: mocks.projects, isLoading: mocks.loadingProjects }),
  useProjectMembers: (projectId?: string) => {
    mocks.projectMembersArg = projectId;
    return { data: mocks.projectMembers, isLoading: mocks.loadingMembers };
  },
}));

vi.mock('@/hooks/useTaxReferenceData', () => ({
  useExternalClients: () => ({ data: mocks.clients, isLoading: false }),
  useTeamProfilesSafe: () => ({ data: mocks.profiles, isLoading: false }),
}));

import { useTarefaDitadaResolvida } from '@/hooks/useTarefaDitadaResolvida';
import type { TarefaSugeridaDoDitado } from '@/hooks/useDitado';

const PROJETO_PIS = { id: 'proj-pis', name: 'Recuperação de PIS', external_client_id: 'cli-alfa' };
const PROJETO_OUTRO = { id: 'proj-outro', name: 'Apuração Simples', external_client_id: 'cli-beta' };

const sugestao = (
  acima: Partial<TarefaSugeridaDoDitado> = {},
): TarefaSugeridaDoDitado => ({
  titulo: 'Revisar apuração',
  descricao: 'Revisar a apuração antes do envio.',
  responsavel_mencionado: null,
  cliente_mencionado: null,
  projeto_mencionado: null,
  horas_estimadas: null,
  transcricaoOriginal: 'fala original',
  classificacao: { nome: 'intencao-ditado', versao: 2, classe: 'criar_tarefa', certeza: 'alta' },
  ...acima,
});

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient() }, children);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.projects = [PROJETO_PIS, PROJETO_OUTRO];
  mocks.clients = [
    { id: 'cli-alfa', nome: 'Cliente Alfa' },
    { id: 'cli-beta', nome: 'Cliente Beta' },
  ];
  mocks.profiles = [
    { id: 'u-ana', first_name: 'Ana', last_name: 'Lima' },
    { id: 'u-bruno', first_name: 'Bruno', last_name: '' },
  ];
  mocks.projectMembers = [];
  mocks.projectMembersArg = undefined;
  mocks.loadingProjects = false;
  mocks.loadingMembers = false;
});

describe('useTarefaDitadaResolvida', () => {
  it('resolve projeto mencionado, deriva o cliente e busca os membros do projeto', async () => {
    mocks.projectMembers = [{ user_id: 'u-ana' }];

    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao({
            projeto_mencionado: 'Recuperação de PIS',
            responsavel_mencionado: 'Ana',
            horas_estimadas: 4,
          }),
          projetoDaTela: PROJETO_OUTRO.id,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());

    // Projeto MENCIONADO prevalece sobre o contexto da tela…
    expect(result.current.valores!.project_id).toBe(PROJETO_PIS.id);
    // …e o cliente vem do vínculo cadastral do projeto.
    expect(result.current.valores!.client_id).toBe('cli-alfa');
    // O responsável saiu dos MEMBROS do projeto resolvido (os membros pedidos
    // ao banco foram os do projeto ditado, não os do contexto).
    expect(mocks.projectMembersArg).toBe(PROJETO_PIS.id);
    expect(result.current.valores!.assigned_to).toBe('u-ana');
    expect(result.current.valores!.assigned_to_name).toBe('Ana Lima');
    expect(result.current.valores!.estimated_hours).toBe(4);
    expect(result.current.camposNaoResolvidos).toEqual([]);
  });

  it('sem menção de projeto usa o projeto do contexto da tela', async () => {
    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao(),
          projetoDaTela: PROJETO_OUTRO.id,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());
    expect(result.current.valores!.project_id).toBe(PROJETO_OUTRO.id);
    expect(result.current.valores!.client_id).toBe('cli-beta');
    expect(mocks.projectMembersArg).toBe(PROJETO_OUTRO.id);
  });

  it('projeto mencionado e inválido NÃO cai no projeto da tela', async () => {
    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao({ projeto_mencionado: 'Projeto Fantasma' }),
          projetoDaTela: PROJETO_OUTRO.id,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());
    expect(result.current.valores!.project_id).toBeUndefined();
    expect(result.current.valores!.client_id).toBeUndefined();
    expect(result.current.camposNaoResolvidos).toContain('projeto');
  });

  it('responsável mencionado fora dos membros do projeto fica vazio', async () => {
    // Ana está no projeto; o membro resolvido só entra com perfil correspondente.
    mocks.projectMembers = [{ user_id: 'u-bruno' }];

    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao({
            projeto_mencionado: 'Recuperação de PIS',
            responsavel_mencionado: 'Ana',
          }),
          projetoDaTela: null,
          membrosDaArea: [{ id: 'u-ana', name: 'Ana Lima' }],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());
    // Membros da área NÃO resolvem quando há projeto: a restrição é ao projeto.
    expect(result.current.valores!.assigned_to).toBeUndefined();
    expect(result.current.camposNaoResolvidos).toContain('responsavel');
  });

  it('dois homônimos no projeto deixam o responsável vazio', async () => {
    mocks.profiles = [
      { id: 'u-ana-1', first_name: 'Ana', last_name: 'Lima' },
      { id: 'u-ana-2', first_name: 'Ana', last_name: 'Sousa' },
    ];
    mocks.projectMembers = [{ user_id: 'u-ana-1' }, { user_id: 'u-ana-2' }];

    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao({
            projeto_mencionado: 'Recuperação de PIS',
            responsavel_mencionado: 'Ana',
          }),
          projetoDaTela: null,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());
    expect(result.current.valores!.assigned_to).toBeUndefined();
    expect(result.current.camposNaoResolvidos).toContain('responsavel');
  });

  it('campos não mencionados ficam vazios e a transcrição não vai para a descrição', async () => {
    const { result } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao(),
          projetoDaTela: null,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.valores).not.toBeNull());
    const valores = result.current.valores!;
    expect(valores.title).toBe('Revisar apuração');
    expect(valores.description).not.toContain('fala original');
    expect(valores.description.length).toBeGreaterThan(0);
    expect(valores.project_id).toBeUndefined();
    expect(valores.client_id).toBeUndefined();
    expect(valores.assigned_to).toBeUndefined();
    expect(valores.estimated_hours).toBeUndefined();
  });

  it('fica carregando enquanto as listas não chegam e não devolve valores pela metade', async () => {
    mocks.loadingProjects = true;

    const { result, rerender } = renderHook(
      () =>
        useTarefaDitadaResolvida({
          sugestao: sugestao(),
          projetoDaTela: PROJETO_PIS.id,
          membrosDaArea: [],
        }),
      { wrapper },
    );

    expect(result.current.carregando).toBe(true);
    expect(result.current.valores).toBeNull();

    // Os mocks não são React Query de verdade: cada fase de carregamento vem
    // com um re-render explícito.
    mocks.loadingProjects = false;
    mocks.loadingMembers = true;
    rerender();
    await waitFor(() => expect(result.current.carregando).toBe(true));

    mocks.loadingMembers = false;
    rerender();
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
      // Valores completos, nunca um payload parcial.
      expect(result.current.valores!.project_id).toBe(PROJETO_PIS.id);
      expect(result.current.valores!.client_id).toBe('cli-alfa');
    });
  });
});
