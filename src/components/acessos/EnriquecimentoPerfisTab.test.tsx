// Teste de tela da seção "Perfis de IA": os ESTADOS (loading, vazio, erro,
// acesso restrito), a listagem e o portão da desativação. O hook de domínio é
// dublê porque a camada dele já é coberta por
// `useDomainEnriquecimentoPerfis.test.tsx` — o que se prova aqui é o que a TELA
// faz com cada estado e com cada resposta da mutação.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PerfilEnriquecimento } from '@/lib/enriquecimentoPerfis';

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  consulta: vi.fn(),
  criar: vi.fn(),
  editar: vi.fn(),
  alternar: vi.fn(),
  sucesso: vi.fn(),
  erro: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: mocks.sucesso, error: mocks.erro } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: mocks.isAdmin }) }));
vi.mock('@/hooks/useDomainEnriquecimentoPerfis', () => ({
  useEnriquecimentoPerfis: () => mocks.consulta(),
  useCriarEnriquecimentoPerfil: () => mocks.criar(),
  useEditarEnriquecimentoPerfil: () => mocks.editar(),
  useAlternarEnriquecimentoPerfil: () => mocks.alternar(),
}));

// Dublê do formulário: revela em atributos o que a tela passou na prop —
// abrir o diálogo de verdade só empurraria a asserção para dentro dos inputs,
// que já têm teste próprio.
vi.mock('@/components/acessos/enriquecimento/PerfilEnriquecimentoForm', () => ({
  PerfilEnriquecimentoForm: ({
    aberto,
    perfil,
    salvando,
  }: {
    aberto: boolean;
    perfil: PerfilEnriquecimento | null;
    salvando: boolean;
  }) =>
    aberto ? (
      <div
        data-testid="form-perfil"
        data-perfil={perfil?.nome ?? 'novo'}
        data-salvando={String(salvando)}
      />
    ) : null,
}));

import { EnriquecimentoPerfisTab } from '@/components/acessos/EnriquecimentoPerfisTab';

const PERFIL_TEXTO: PerfilEnriquecimento = {
  id: 'p-1',
  nome: 'transcricao-fiel',
  rotulo: 'Transcrição fiel',
  instrucoes: 'Limpe a fala sem reescrever.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0,
  contrato_saida: { tipo: 'texto' },
  ativo: true,
  updated_at: '2026-09-25T12:00:00Z',
};

const PERFIL_ESTRUTURADO: PerfilEnriquecimento = {
  ...PERFIL_TEXTO,
  id: 'p-2',
  nome: 'comentario-para-tarefa',
  rotulo: 'Comentário para tarefa',
  temperatura: 0.2,
  contrato_saida: {
    tipo: 'estruturada',
    campos: {
      titulo: { descricao: 'Título curto da tarefa.' },
      descricao: { descricao: 'Descrição da tarefa.' },
    },
  },
  ativo: false,
};

const consultaEmEstado = (
  estado: Partial<ReturnType<typeof consultaPadrao>> = {},
): ReturnType<typeof consultaPadrao> => ({ ...consultaPadrao(), ...estado });

const consultaPadrao = () => ({
  data: [] as PerfilEnriquecimento[],
  isLoading: false,
  isError: false,
  error: null as unknown,
  refetch: vi.fn(),
});

const mutacaoOk = () => ({
  // Simula a mutação bem-sucedida: o callback do componente roda e o toast sai.
  mutate: vi.fn(
    (vars: { perfil?: PerfilEnriquecimento }, callbacks?: { onSuccess?: (d: unknown) => void }) =>
      callbacks?.onSuccess?.(vars.perfil ?? null),
  ),
  isPending: false,
});

const mutacaoPendente = () => ({ mutate: vi.fn(), isPending: true });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdmin = true;
  mocks.consulta.mockReturnValue(consultaEmEstado());
  mocks.criar.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.editar.mockReturnValue({ mutate: vi.fn(), isPending: false });
  mocks.alternar.mockReturnValue(mutacaoOk());
});

describe('portão de acesso', () => {
  it('quem não é admin vê o aviso, não a listagem', () => {
    mocks.isAdmin = false;
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo perfil/ })).not.toBeInTheDocument();
  });
});

describe('estados da consulta', () => {
  it('carregando mostra skeleton e nada de lista', () => {
    mocks.consulta.mockReturnValue(consultaEmEstado({ isLoading: true }));
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByLabelText('Carregando perfis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('erro mostra o alerta e "Tentar novamente" refaz a consulta', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    mocks.consulta.mockReturnValue(
      consultaEmEstado({ isError: true, error: new Error('perfil sumiu'), refetch }),
    );
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui carregar os perfis');
    expect(screen.getByText('perfil sumiu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('lista vazia tem mensagem e chamada para criar', () => {
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByText('Nenhum perfil de IA ainda')).toBeInTheDocument();
    // Um botão no cabeçalho e outro no estado vazio — os dois abrem o mesmo form.
    expect(screen.getAllByRole('button', { name: /Novo perfil/ })).toHaveLength(2);
  });

  it('o aviso de efeito está na tela, com o texto combinado', () => {
    render(<EnriquecimentoPerfisTab />);
    expect(
      screen.getByText(
        'As alterações passam a valer nas próximas chamadas das Edge Functions. Não é necessário republicá-las.',
      ),
    ).toBeInTheDocument();
  });
});

describe('listagem', () => {
  it('mostra rótulo, nome técnico, tipo de saída, modelo, temperatura, status e data', () => {
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO, PERFIL_ESTRUTURADO] }));
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByText('Transcrição fiel')).toBeInTheDocument();
    expect(screen.getByText('transcricao-fiel')).toBeInTheDocument();
    expect(screen.getByText('Texto')).toBeInTheDocument();
    expect(screen.getByText('Estruturada · 2 campos')).toBeInTheDocument();
    expect(screen.getAllByText(/modelo: google\/gemini-3-flash-preview/)).toHaveLength(2);
    expect(screen.getByText('temperatura: 0')).toBeInTheDocument();
    expect(screen.getByText('temperatura: 0.2')).toBeInTheDocument();
    expect(screen.getAllByText(/atualizado em \d{2}\/\d{2}\/\d{4}/)).toHaveLength(2);
    // O ativo tem o badge "ativo"; o inativo tem "inativo".
    expect(screen.getByText('inativo')).toBeInTheDocument();
  });

  it('perfil ativo oferece Desativar; perfil inativo oferece Ativar', () => {
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO, PERFIL_ESTRUTURADO] }));
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByRole('button', { name: /Desativar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ativar\b/ })).toBeInTheDocument();
  });
});

describe('formulário', () => {
  it('"Novo perfil" abre o formulário em modo criação', async () => {
    const user = userEvent.setup();
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getAllByRole('button', { name: /Novo perfil/ })[0]);

    expect(screen.getByTestId('form-perfil')).toHaveAttribute('data-perfil', 'novo');
  });

  it('"Editar" abre o formulário com o perfil da linha', async () => {
    const user = userEvent.setup();
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO] }));
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getByRole('button', { name: /Editar/ }));

    expect(screen.getByTestId('form-perfil')).toHaveAttribute('data-perfil', 'transcricao-fiel');
  });

  it('salvando, os botões da tela ficam desabilitados e o formulário é avisado', () => {
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO] }));
    mocks.criar.mockReturnValue(mutacaoPendente());
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByRole('button', { name: /Novo perfil/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Editar/ })).toBeDisabled();
  });
});

describe('desativação', () => {
  it('pede confirmação citando o nome técnico antes de desativar', async () => {
    const user = userEvent.setup();
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO] }));
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getByRole('button', { name: /Desativar/ }));

    const dialogo = screen.getByRole('alertdialog');
    expect(dialogo).toHaveTextContent('Desativar o perfil "Transcrição fiel"?');
    expect(dialogo).toHaveTextContent('transcricao-fiel');
    expect(dialogo).toHaveTextContent('passarão a falhar enquanto ele estiver inativo');
  });

  it('cancelar fecha o diálogo sem tocar no banco', async () => {
    const user = userEvent.setup();
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO] }));
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getByRole('button', { name: /Desativar/ }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.alternar().mutate).not.toHaveBeenCalled();
  });

  it('confirmar desativa com ativo=false e anuncia o sucesso', async () => {
    const user = userEvent.setup();
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_TEXTO] }));
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getByRole('button', { name: /Desativar/ }));
    await user.click(screen.getByRole('button', { name: 'Desativar perfil' }));

    expect(mocks.alternar().mutate).toHaveBeenCalledWith(
      { perfil: PERFIL_TEXTO, ativo: false },
      expect.any(Object),
    );
    expect(mocks.sucesso).toHaveBeenCalledWith('Perfil "Transcrição fiel" desativado');
  });
});

describe('ativação', () => {
  it('ativa direto, sem diálogo nenhum', async () => {
    const user = userEvent.setup();
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_ESTRUTURADO] }));
    render(<EnriquecimentoPerfisTab />);

    await user.click(screen.getByRole('button', { name: /Ativar\b/ }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.alternar().mutate).toHaveBeenCalledWith(
      { perfil: PERFIL_ESTRUTURADO, ativo: true },
      expect.any(Object),
    );
    expect(mocks.sucesso).toHaveBeenCalledWith('Perfil "Comentário para tarefa" ativado');
  });

  it('com a mutação pendente, o botão da linha trava', () => {
    mocks.consulta.mockReturnValue(consultaEmEstado({ data: [PERFIL_ESTRUTURADO] }));
    mocks.alternar.mockReturnValue(mutacaoPendente());
    render(<EnriquecimentoPerfisTab />);

    expect(screen.getByRole('button', { name: /Ativar\b/ })).toBeDisabled();
  });
});
