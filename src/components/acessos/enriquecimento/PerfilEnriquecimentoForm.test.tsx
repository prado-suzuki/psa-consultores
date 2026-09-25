import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { PerfilEnriquecimento } from '@/lib/enriquecimentoPerfis';
import { PerfilEnriquecimentoForm } from '@/components/acessos/enriquecimento/PerfilEnriquecimentoForm';

const PERFIL_ESTRUTURADO: PerfilEnriquecimento = {
  id: 'p1',
  nome: 'comentario-para-tarefa',
  rotulo: 'Comentário para tarefa',
  instrucoes: 'Transforme o comentário em uma única tarefa.',
  modelo: 'google/gemini-3-flash-preview',
  temperatura: 0.2,
  contrato_saida: {
    tipo: 'estruturada',
    campos: {
      titulo: { descricao: 'Título curto da tarefa.' },
      descricao: { descricao: 'Descrição completa da tarefa.' },
    },
  },
  ativo: true,
  updated_at: '2026-09-25T12:00:00Z',
};

const montar = (props: Partial<Parameters<typeof PerfilEnriquecimentoForm>[0]> = {}) => {
  const onSalvar = vi.fn();
  const onFechar = vi.fn();
  render(
    <PerfilEnriquecimentoForm
      aberto
      perfil={null}
      salvando={false}
      onSalvar={onSalvar}
      onFechar={onFechar}
      {...props}
    />,
  );
  return { onSalvar, onFechar };
};

describe('abertura do formulário', () => {
  it('na criação o nome técnico é editável e vem vazio', () => {
    montar();
    const nome = screen.getByLabelText('Nome técnico');
    expect(nome).toBeEnabled();
    expect(nome).toHaveValue('');
  });

  it('na edição o nome técnico vem preenchido e BLOQUEADO — é a chave de integração', () => {
    montar({ perfil: PERFIL_ESTRUTURADO });

    const nome = screen.getByLabelText('Nome técnico');
    expect(nome).toBeDisabled();
    expect(nome).toHaveValue('comentario-para-tarefa');
    // O resto continua editável e preenchido com o que o banco tem.
    expect(screen.getByLabelText('Rótulo')).toHaveValue('Comentário para tarefa');
    expect(screen.getByLabelText(/Instruções/)).toHaveValue(
      'Transforme o comentário em uma única tarefa.',
    );
  });

  it('na edição, o aviso do campo diz que renomear quebraria os chamadores', () => {
    montar({ perfil: PERFIL_ESTRUTURADO });
    expect(screen.getByText(/Renomear quebraria os chamadores/)).toBeInTheDocument();
  });
});

describe('tipo de saída', () => {
  it('texto único não mostra editor de campos', () => {
    montar();
    expect(screen.queryByRole('button', { name: /Adicionar campo/ })).not.toBeInTheDocument();
  });

  it('escolhendo estruturada, o editor de campos aparece e "Adicionar campo" cria linhas', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByLabelText(/Estruturada/));
    expect(screen.getByRole('button', { name: /Adicionar campo/ })).toBeInTheDocument();
    expect(screen.getByText(/Nenhum campo ainda/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    expect(screen.getByLabelText('Nome técnico do campo 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    expect(screen.getByLabelText('Nome técnico do campo 2')).toBeInTheDocument();
  });

  it('a edição de um perfil estruturado abre com os campos do contrato', () => {
    montar({ perfil: PERFIL_ESTRUTURADO });

    expect(screen.getByLabelText('Nome técnico do campo 1')).toHaveValue('titulo');
    expect(screen.getByLabelText('Descrição do campo 1')).toHaveValue('Título curto da tarefa.');
    expect(screen.getByLabelText('Nome técnico do campo 2')).toHaveValue('descricao');
  });

  it('o botão de remover tira só a linha dele', async () => {
    const user = userEvent.setup();
    montar({ perfil: PERFIL_ESTRUTURADO });

    await user.click(screen.getByRole('button', { name: 'Remover campo 1' }));

    // A linha que restou (descricao) virou a primeira.
    expect(screen.getByLabelText('Nome técnico do campo 1')).toHaveValue('descricao');
  });
});

describe('validação e envio', () => {
  it('não salva com campos obrigatórios vazios e mostra os erros', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(screen.getByText('Informe o nome do perfil.')).toBeInTheDocument();
    expect(screen.getByText('Informe o rótulo.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('nome com maiúscula é recusado antes de chegar ao banco', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'Nome Errado');
    await user.type(screen.getByLabelText('Rótulo'), 'Algum rótulo');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções aqui.');
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(
      screen.getByText('Use apenas letras minúsculas, números e hífens, começando por letra.'),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('estruturada sem campo nenhum não salva e reclama do mínimo', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'perfil-1');
    await user.type(screen.getByLabelText('Rótulo'), 'Perfil 1');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções.');
    await user.click(screen.getByLabelText(/Estruturada/));
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(
      screen.getByText('A saída estruturada precisa de pelo menos um campo.'),
    ).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('estruturada com campo duplicado não salva', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'perfil-1');
    await user.type(screen.getByLabelText('Rótulo'), 'Perfil 1');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções.');
    await user.click(screen.getByLabelText(/Estruturada/));
    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    await user.type(screen.getByLabelText('Nome técnico do campo 1'), 'titulo');
    await user.type(screen.getByLabelText('Nome técnico do campo 2'), 'titulo');
    await user.type(screen.getByLabelText('Descrição do campo 1'), 'um');
    await user.type(screen.getByLabelText('Descrição do campo 2'), 'dois');
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(screen.getByText('Já existe um campo com este nome.')).toBeInTheDocument();
    expect(onSalvar).not.toHaveBeenCalled();
  });

  it('salva o perfil de texto com o contrato montado', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'perfil-1');
    await user.type(screen.getByLabelText('Rótulo'), 'Perfil 1');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções.');
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(onSalvar).toHaveBeenCalledTimes(1);
    expect(onSalvar).toHaveBeenCalledWith({
      nome: 'perfil-1',
      rotulo: 'Perfil 1',
      instrucoes: 'Instruções.',
      modelo: 'google/gemini-3-flash-preview',
      temperatura: 0.2,
      contrato_saida: { tipo: 'texto' },
      ativo: true,
    });
  });

  it('salva o perfil estruturado com os campos convertidos em objeto', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'perfil-1');
    await user.type(screen.getByLabelText('Rótulo'), 'Perfil 1');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções.');
    await user.click(screen.getByLabelText(/Estruturada/));
    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    await user.type(screen.getByLabelText('Nome técnico do campo 1'), 'titulo');
    await user.type(screen.getByLabelText('Descrição do campo 1'), 'Título curto da tarefa.');
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(onSalvar).toHaveBeenCalledWith(
      expect.objectContaining({
        contrato_saida: {
          tipo: 'estruturada',
          campos: { titulo: { descricao: 'Título curto da tarefa.' } },
        },
      }),
    );
  });

  it('desligando o status, o payload sai com ativo=false', async () => {
    const user = userEvent.setup();
    const { onSalvar } = montar();

    await user.type(screen.getByLabelText('Nome técnico'), 'perfil-1');
    await user.type(screen.getByLabelText('Rótulo'), 'Perfil 1');
    await user.type(screen.getByLabelText(/Instruções/), 'Instruções.');
    await user.click(screen.getByLabelText('Perfil ativo'));
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ ativo: false }));
  });

  it('enquanto salva, os botões ficam desabilitados', () => {
    montar({ salvando: true });

    // No estado de salvamento o botão principal troca o texto para "Salvando…".
    expect(screen.getByRole('button', { name: /Salvando/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('cancelar fecha sem salvar', async () => {
    const user = userEvent.setup();
    const { onFechar, onSalvar } = montar();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onFechar).toHaveBeenCalledTimes(1);
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

// Guarda do caso "campo sem erro": o array de erros de campo é esparso e o
// formulário não pode reclamar de campo que não tem problema.
describe('erros por campo', () => {
  it('campo válido na linha errada não herda erro de outra linha', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByLabelText(/Estruturada/));
    await user.click(screen.getByRole('button', { name: /Adicionar campo/ }));
    // Só o nome preenchido; a descrição vazia gera erro SÓ nela, não no nome.
    await user.type(screen.getByLabelText('Nome técnico do campo 1'), 'titulo');
    await user.click(screen.getByRole('button', { name: /Salvar perfil/ }));

    expect(screen.queryByText('Informe o nome do campo.')).not.toBeInTheDocument();
    expect(screen.getByText('Informe a descrição enviada ao modelo.')).toBeInTheDocument();
  });
});
