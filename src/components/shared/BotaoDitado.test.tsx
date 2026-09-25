import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResultadoDitado } from '@/hooks/useDitado';

const mocks = vi.hoisted(() => ({
  onResultado: null as ((resultado: ResultadoDitado) => void) | null,
}));

vi.mock('@/hooks/useDitado', () => ({
  useDitado: ({ onResultado }: { onResultado: (resultado: ResultadoDitado) => void }) => {
    mocks.onResultado = onResultado;
    return { estado: 'ocioso', segundos: 0, erro: null, iniciar: vi.fn(), parar: vi.fn() };
  },
}));

import { BotaoDitado } from '@/components/shared/BotaoDitado';

describe('BotaoDitado', () => {
  beforeEach(() => {
    mocks.onResultado = null;
  });

  it('insere a transcrição quando a ação é continuar no editor', () => {
    const inserirTexto = vi.fn();
    render(<BotaoDitado ditado="comentario" alvo={{ inserirTexto }} />);

    act(() => mocks.onResultado?.({ texto: 'Comentário limpo.', acao: { tipo: 'inserir_texto' } }));

    expect(inserirTexto).toHaveBeenCalledWith('Comentário limpo.');
  });

  it('entrega a tarefa sem inserir a fala no comentário', () => {
    const inserirTexto = vi.fn();
    const onTarefaSugerida = vi.fn();
    render(
      <BotaoDitado
        ditado="comentario"
        alvo={{ inserirTexto }}
        onTarefaSugerida={onTarefaSugerida}
      />,
    );

    act(() =>
      mocks.onResultado?.({
        texto: 'Preciso revisar o relatório.',
        acao: {
          tipo: 'abrir_tarefa',
          titulo: 'Revisar relatório',
          descricao: 'Revise o relatório antes do envio.',
          responsavel_mencionado: 'Ana',
          cliente_mencionado: null,
          projeto_mencionado: null,
          horas_estimadas: 4,
          classificacao: {
            nome: 'intencao-ditado',
            versao: 1,
            classe: 'criar_tarefa',
            certeza: 'alta',
          },
        },
      }),
    );

    expect(inserirTexto).not.toHaveBeenCalled();
    expect(onTarefaSugerida).toHaveBeenCalledWith({
      titulo: 'Revisar relatório',
      descricao: 'Revise o relatório antes do envio.',
      responsavel_mencionado: 'Ana',
      cliente_mencionado: null,
      projeto_mencionado: null,
      horas_estimadas: 4,
      transcricaoOriginal: 'Preciso revisar o relatório.',
      classificacao: {
        nome: 'intencao-ditado',
        versao: 1,
        classe: 'criar_tarefa',
        certeza: 'alta',
      },
    });
  });

  it('preserva a fala quando o consumidor não sabe abrir tarefa', () => {
    const inserirTexto = vi.fn();
    render(<BotaoDitado ditado="comentario" alvo={{ inserirTexto }} />);

    act(() =>
      mocks.onResultado?.({
        texto: 'Preciso revisar o relatório.',
        acao: {
          tipo: 'abrir_tarefa',
          titulo: 'Revisar relatório',
          descricao: 'Revise o relatório.',
          responsavel_mencionado: null,
          cliente_mencionado: null,
          projeto_mencionado: null,
          horas_estimadas: null,
          classificacao: {
            nome: 'intencao-ditado',
            versao: 1,
            classe: 'criar_tarefa',
            certeza: 'alta',
          },
        },
      }),
    );

    expect(inserirTexto).toHaveBeenCalledWith('Preciso revisar o relatório.');
  });
});
