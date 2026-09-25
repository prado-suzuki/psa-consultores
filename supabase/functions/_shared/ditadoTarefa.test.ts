import { describe, expect, it } from 'vitest';

import { montarAcaoTarefa } from './ditadoTarefa';
import type { ValorEnriquecido } from './enriquecimentoTexto';

const CLASSIFICACAO = {
  nome: 'intencao-ditado',
  versao: 2,
  classe: 'criar_tarefa',
  certeza: 'alta' as const,
};

function campoTexto(texto: string | null): { valor: ValorEnriquecido; destino: 'simples' } {
  return { valor: { tipo: 'texto', texto }, destino: 'simples' };
}

function campoNumero(numero: number | null): { valor: ValorEnriquecido; destino: 'simples' } {
  return { valor: { tipo: 'numero', numero }, destino: 'simples' };
}

function campos(
  valores: Record<string, { valor: ValorEnriquecido; destino: 'simples' }>,
): Record<string, { valor: ValorEnriquecido; destino: 'simples' }> {
  return valores;
}

describe('montarAcaoTarefa', () => {
  it('devolve todos os campos quando a fala mencionou tudo', () => {
    const acao = montarAcaoTarefa(
      campos({
        titulo: campoTexto('Revisar apuração'),
        descricao: campoTexto('Revisar a apuração antes do envio.'),
        responsavel_mencionado: campoTexto('Ana'),
        cliente_mencionado: campoTexto('Cliente Alfa'),
        projeto_mencionado: campoTexto('Recuperação de PIS'),
        horas_estimadas: campoNumero(4),
      }),
      CLASSIFICACAO,
    );

    expect(acao).toEqual({
      tipo: 'abrir_tarefa',
      titulo: 'Revisar apuração',
      descricao: 'Revisar a apuração antes do envio.',
      responsavel_mencionado: 'Ana',
      cliente_mencionado: 'Cliente Alfa',
      projeto_mencionado: 'Recuperação de PIS',
      horas_estimadas: 4,
      classificacao: CLASSIFICACAO,
    });
  });

  it('campo não mencionado permanece null', () => {
    const acao = montarAcaoTarefa(
      campos({
        titulo: campoTexto('Registrar apuração'),
        descricao: campoTexto('Registrar a apuração do mês.'),
        responsavel_mencionado: campoTexto(null),
        cliente_mencionado: campoTexto(null),
        projeto_mencionado: campoTexto(null),
        horas_estimadas: campoNumero(null),
      }),
      CLASSIFICACAO,
    );

    expect(acao.responsavel_mencionado).toBeNull();
    expect(acao.cliente_mencionado).toBeNull();
    expect(acao.projeto_mencionado).toBeNull();
    expect(acao.horas_estimadas).toBeNull();
  });

  it('campo de menção ausente da resposta devolve null em vez de estourar', () => {
    const acao = montarAcaoTarefa(
      campos({
        titulo: campoTexto('Revisar apuração'),
        descricao: campoTexto('Revisar a apuração.'),
      }),
      CLASSIFICACAO,
    );

    expect(acao.responsavel_mencionado).toBeNull();
    expect(acao.horas_estimadas).toBeNull();
  });

  it('menção vazia ou com espaços devolve null', () => {
    const acao = montarAcaoTarefa(
      campos({
        titulo: campoTexto('Revisar apuração'),
        descricao: campoTexto('Revisar a apuração.'),
        responsavel_mencionado: campoTexto('   '),
      }),
      CLASSIFICACAO,
    );

    expect(acao.responsavel_mencionado).toBeNull();
  });

  it.each([
    0,
    -2,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])('horas inválidas (%p) tornam-se null', (horas) => {
    const acao = montarAcaoTarefa(
      campos({
        titulo: campoTexto('Revisar apuração'),
        descricao: campoTexto('Revisar a apuração.'),
        horas_estimadas: campoNumero(horas),
      }),
      CLASSIFICACAO,
    );

    expect(acao.horas_estimadas).toBeNull();
  });

  it('exige título e descrição preenchidos', () => {
    expect(() =>
      montarAcaoTarefa(campos({ titulo: campoTexto(' '), descricao: campoTexto('ok') }), CLASSIFICACAO),
    ).toThrow('titulo');
    expect(() =>
      montarAcaoTarefa(campos({ titulo: campoTexto('ok') }), CLASSIFICACAO),
    ).toThrow('descricao');
  });
});
