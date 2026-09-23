import { describe, expect, it } from 'vitest';

import { casarProjeto, lerArquivoDeTarefas } from './importarTarefasBacklog';

describe('lerArquivoDeTarefas', () => {
  it('lista: cada ## vira uma tarefa, com os campos opcionais', () => {
    const texto = [
      '## Lista geral de solicitações',
      'prioridade: Alta',
      'horas: 8',
      'projeto: OSG Work',
      '',
      'Não existe tela que mostre todas.',
      'Criar a lista.',
      '',
      '## Painel de notificações',
      '',
      'Mostrar o que saiu.',
    ].join('\n');

    const [a, b] = lerArquivoDeTarefas('lista.md', texto);

    expect(a).toMatchObject({
      title: 'Lista geral de solicitações',
      priority: 'high',
      estimated_hours: 8,
      projeto_nome: 'OSG Work',
      description: 'Não existe tela que mostre todas. Criar a lista.',
      avisos: [],
    });
    expect(b).toMatchObject({
      title: 'Painel de notificações',
      priority: 'medium',
      estimated_hours: null,
      projeto_nome: null,
      description: 'Mostrar o que saiu.',
    });
  });

  it('aceita "média" sem acento, horas com vírgula e sufixo h', () => {
    const [t] = lerArquivoDeTarefas('x.md', '## T\nprioridade: media\nhoras: 1,5h\n');
    expect(t.priority).toBe('medium');
    expect(t.estimated_hours).toBe(1.5);
  });

  it('valor inválido não trava a importação: fica o padrão e um aviso', () => {
    const [t] = lerArquivoDeTarefas('x.md', '## T\nprioridade: urgente\nhoras: muitas\n');
    expect(t.priority).toBe('medium');
    expect(t.estimated_hours).toBeNull();
    expect(t.avisos).toHaveLength(2);
  });

  it('campo no meio do texto é texto, não campo', () => {
    const [t] = lerArquivoDeTarefas('x.md', '## T\n\nDescrição.\n\nprioridade: alta\n');
    expect(t.priority).toBe('medium');
    expect(t.description).toBe('Descrição.\n\nprioridade: alta');
  });

  it('item de lista continua em linha própria', () => {
    const [t] = lerArquivoDeTarefas('x.md', '## T\n\nFazer:\n- primeiro\n- segundo\n');
    expect(t.description).toBe('Fazer:\n- primeiro\n- segundo');
  });

  it('arquivo de tarefa com # é uma tarefa só, mesmo tendo seções ##', () => {
    const texto = [
      '# TAREFA 1 — A lista geral de solicitações',
      '',
      '> **Pergunta dela:** onde está a lista?',
      '> A resposta é que',
      '> não existe.',
      '>',
      '> Segundo parágrafo.',
      '',
      '## O que foi medido',
      '',
      '```bash',
      '# comentário que não é título',
      '```',
    ].join('\n');

    const tarefas = lerArquivoDeTarefas('TAREFA_lista.md', texto);

    expect(tarefas).toHaveLength(1);
    expect(tarefas[0].title).toBe('A lista geral de solicitações');
    expect(tarefas[0].description).toBe(
      'Pergunta dela: onde está a lista? A resposta é que não existe.\n\nSegundo parágrafo.\n\nArquivo de origem: TAREFA_lista.md',
    );
  });

  it('arquivo de tarefa sem citação usa o primeiro parágrafo', () => {
    const [t] = lerArquivoDeTarefas('a.md', '# Título\r\n\r\nPrimeiro parágrafo.\r\n\r\nSegundo.');
    expect(t.description).toBe('Primeiro parágrafo.\n\nArquivo de origem: a.md');
  });

  it.each([
    ['# TAREFA 1: alterar por cargo', 'Alterar por cargo'],
    ['# TAREFA: os campos novos da OS', 'Os campos novos da OS'],
    ['# TAREFA — Rateio sai junto', 'Rateio sai junto'],
    ['# TAREFA Relatorios e Apresentacoes', 'Relatorios e Apresentacoes'],
    ['# O Board acompanha', 'O Board acompanha'],
  ])('título "%s" vira "%s"', (linha, esperado) => {
    expect(lerArquivoDeTarefas('a.md', `${linha}\n\nTexto.`)[0].title).toBe(esperado);
  });

  it('tarefa aposentada entra desmarcada, com aviso e sem o ## no resumo', () => {
    const [t] = lerArquivoDeTarefas('a.md', '# TAREFA — X\n\n> ## ⛔ APOSENTADA em 02/09\n>\n> Motivo.');
    expect(t.sugerida).toBe(false);
    expect(t.avisos).toHaveLength(1);
    expect(t.description.startsWith('⛔ APOSENTADA')).toBe(true);
  });

  it('README da pasta da sprint é índice e não vira tarefa', () => {
    expect(lerArquivoDeTarefas('README.md', '# Tarefas da sprint 14\n\nÍndice.')).toEqual([]);
  });

  it('## dentro de bloco de código não abre tarefa', () => {
    const texto = '## Real\n\n```md\n## falso\n```\n';
    expect(lerArquivoDeTarefas('x.md', texto)).toHaveLength(1);
  });

  it('arquivo sem título nenhum devolve lista vazia', () => {
    expect(lerArquivoDeTarefas('x.md', 'só texto')).toEqual([]);
  });
});

describe('casarProjeto', () => {
  const projetos = [{ id: 'p1', name: 'Gestão Tributária' }];

  it('ignora acento e caixa', () => {
    expect(casarProjeto('gestao tributaria', projetos)).toBe('p1');
  });

  it('nome desconhecido ou ausente não casa', () => {
    expect(casarProjeto('Outro', projetos)).toBeNull();
    expect(casarProjeto(null, projetos)).toBeNull();
  });
});
