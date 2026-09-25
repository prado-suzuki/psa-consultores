import { describe, expect, it } from 'vitest';

import {
  mencaoLimpa,
  mensagemCampoNaoResolvido,
  normalizarNome,
  resolverTarefaDitada,
  type ListasParaResolucao,
} from './resolverTarefaDitada';

const PROJETO_PIS = { id: 'proj-pis', nome: 'Recuperação de PIS', external_client_id: 'cli-alfa' };
const PROJETO_SIMPLES = { id: 'proj-simples', nome: 'Apuração Simples', external_client_id: 'cli-beta' };
const PROJETO_GEMEO = { id: 'proj-gemeo', nome: 'Recuperação de PIS - Fase 2', external_client_id: 'cli-alfa' };

const CLIENTE_ALFA = { id: 'cli-alfa', nome: 'Cliente Alfa' };
const CLIENTE_BETA = { id: 'cli-beta', nome: 'Cliente Beta' };

const ANA_LIMA = { id: 'u-ana-lima', name: 'Ana Lima' };
const ANA_SOUSA = { id: 'u-ana-sousa', name: 'Ana Sousa' };
const BRUNO = { id: 'u-bruno', name: 'Bruno Carvalho' };

const listasBase = (acima: Partial<ListasParaResolucao> = {}): ListasParaResolucao => ({
  projetos: [PROJETO_PIS, PROJETO_SIMPLES],
  clientes: [CLIENTE_ALFA, CLIENTE_BETA],
  membrosDoProjeto: [ANA_LIMA, BRUNO],
  membrosDaArea: [BRUNO],
  ...acima,
});

const sugestao = (acima: Record<string, unknown> = {}) => ({
  responsavel_mencionado: null,
  cliente_mencionado: null,
  projeto_mencionado: null,
  horas_estimadas: null,
  ...acima,
});

describe('normalização', () => {
  it('remove acentos, caixa e espaços sobrando', () => {
    expect(normalizarNome('  REcuperação   de  PIS ')).toBe('recuperacao de pis');
    expect(normalizarNome('Ána-Líma')).toBe('ana-lima');
  });

  it('solta artigos e preposições das pontas da menção', () => {
    expect(mencaoLimpa('para o cliente Alfa')).toBe('cliente alfa');
    expect(mencaoLimpa('da Recuperação de PIS')).toBe('recuperacao de pis');
    // Uma única palavra nunca é descartada, ainda que seja artigo.
    expect(mencaoLimpa('de')).toBe('de');
  });
});

describe('resolução do projeto', () => {
  it('projeto mencionado e resolvido unicamente prevalece sobre o contexto da tela', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples' }),
      listasBase(),
      PROJETO_PIS.id,
    );

    expect(resolucao.projetoId).toBe(PROJETO_SIMPLES.id);
  });

  it('sem menção de projeto, o projeto do contexto da tela é usado', () => {
    const resolucao = resolverTarefaDitada(sugestao(), listasBase(), PROJETO_PIS.id);

    expect(resolucao.projetoId).toBe(PROJETO_PIS.id);
  });

  it('sem menção e sem projeto na tela, fica vazio', () => {
    const resolucao = resolverTarefaDitada(sugestao(), listasBase(), null);

    expect(resolucao.projetoId).toBeNull();
  });

  it('menção com acento e caixa diferentes resolve igual', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'recuperacao de pis' }),
      listasBase(),
      PROJETO_SIMPLES.id,
    );

    expect(resolucao.projetoId).toBe(PROJETO_PIS.id);
  });

  it('menção parcial única resolve', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Recuperação de PIS' }),
      listasBase({ projetos: [PROJETO_PIS, PROJETO_GEMEO, PROJETO_SIMPLES] }),
      null,
    );

    // "recuperacao de pis" está contida nos dois nomes → ambíguo… mas a EXATA
    // existe e é única: ela vence.
    expect(resolucao.projetoId).toBe(PROJETO_PIS.id);
  });

  it('menção parcial ambígua não resolve e não cai no projeto da tela', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Recuperação' }),
      listasBase({ projetos: [PROJETO_PIS, PROJETO_GEMEO, PROJETO_SIMPLES] }),
      PROJETO_SIMPLES.id,
    );

    expect(resolucao.projetoId).toBeNull();
    expect(resolucao.camposNaoResolvidos).toContain('projeto');
  });

  it('menção de projeto inválida (inexistente) deixa vazio em vez de usar o contexto da tela', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Projeto Inexistente' }),
      listasBase(),
      PROJETO_PIS.id,
    );

    expect(resolucao.projetoId).toBeNull();
    expect(resolucao.camposNaoResolvidos).toContain('projeto');
  });
});

describe('resolução do cliente', () => {
  it('cliente é derivado do projeto resolvido', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples' }),
      listasBase(),
      null,
    );

    expect(resolucao.clienteId).toBe(CLIENTE_BETA.id);
  });

  it('sem projeto, o cliente mencionado é resolvido unicamente', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ cliente_mencionado: 'Cliente Alfa' }),
      listasBase(),
      null,
    );

    expect(resolucao.clienteId).toBe(CLIENTE_ALFA.id);
    expect(resolucao.projetoId).toBeNull();
  });

  it('sem projeto e cliente mencionado ambíguo, fica vazio com aviso', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ cliente_mencionado: 'Cliente' }),
      listasBase({ clientes: [CLIENTE_ALFA, { ...CLIENTE_BETA, nome: 'Cliente Beta' }] }),
      null,
    );

    expect(resolucao.clienteId).toBeNull();
    expect(resolucao.camposNaoResolvidos).toContain('cliente');
  });

  it('sem projeto e sem cliente mencionado, fica vazio sem aviso', () => {
    const resolucao = resolverTarefaDitada(sugestao(), listasBase(), null);

    expect(resolucao.clienteId).toBeNull();
    expect(resolucao.camposNaoResolvidos).not.toContain('cliente');
  });

  it('cliente mencionado incompatível com o projeto preserva o vínculo cadastral e registra conflito', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples', cliente_mencionado: 'Cliente Alfa' }),
      listasBase(),
      null,
    );

    expect(resolucao.projetoId).toBe(PROJETO_SIMPLES.id);
    expect(resolucao.clienteId).toBe(CLIENTE_BETA.id);
    expect(resolucao.conflitos).toHaveLength(1);
    expect(resolucao.conflitos[0]).toContain('Cliente Alfa');
  });

  it('cliente mencionado não identificável com projeto resolvido mantém o cliente do projeto e registra conflito', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples', cliente_mencionado: 'Cliente Zeta' }),
      listasBase(),
      null,
    );

    expect(resolucao.clienteId).toBe(CLIENTE_BETA.id);
    expect(resolucao.conflitos[0]).toContain('Cliente Zeta');
    // Não é falha de resolução: o campo acabou preenchido.
    expect(resolucao.camposNaoResolvidos).not.toContain('cliente');
  });

  it('cliente mencionado igual ao do projeto não gera conflito', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples', cliente_mencionado: 'cliente beta' }),
      listasBase(),
      null,
    );

    expect(resolucao.clienteId).toBe(CLIENTE_BETA.id);
    expect(resolucao.conflitos).toHaveLength(0);
  });
});

describe('resolução do responsável', () => {
  it('nome completo é resolvido entre os membros do projeto', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples', responsavel_mencionado: 'Ana Lima' }),
      listasBase(),
      null,
    );

    expect(resolucao.responsavelId).toBe(ANA_LIMA.id);
    expect(resolucao.responsavelNome).toBe('Ana Lima');
  });

  it('primeiro nome único é resolvido', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ responsavel_mencionado: 'Bruno' }),
      listasBase({ membrosDaArea: [BRUNO] }),
      null,
    );

    expect(resolucao.responsavelId).toBe(BRUNO.id);
  });

  it('duas pessoas chamadas Ana resultam em vazio', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ responsavel_mencionado: 'Ana' }),
      listasBase({ membrosDoProjeto: [ANA_LIMA, ANA_SOUSA, BRUNO] }),
      null,
    );

    expect(resolucao.responsavelId).toBeNull();
    expect(resolucao.responsavelNome).toBeNull();
    expect(resolucao.camposNaoResolvidos).toContain('responsavel');
  });

  it('responsável é restrito aos membros do projeto: gente da área de fora não resolve', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ projeto_mencionado: 'Apuração Simples', responsavel_mencionado: 'Ana Sousa' }),
      listasBase({ membrosDoProjeto: [ANA_LIMA, BRUNO], membrosDaArea: [ANA_LIMA, ANA_SOUSA, BRUNO] }),
      null,
    );

    expect(resolucao.responsavelId).toBeNull();
    expect(resolucao.camposNaoResolvidos).toContain('responsavel');
  });

  it('sem projeto, a resolução usa os membros da área', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ responsavel_mencionado: 'Bruno Carvalho' }),
      listasBase({ membrosDoProjeto: [ANA_LIMA] }),
      null,
    );

    expect(resolucao.responsavelId).toBe(BRUNO.id);
  });

  it('nome com acento e variação de caixa resolve', () => {
    const resolucao = resolverTarefaDitada(
      sugestao({ responsavel_mencionado: 'âna líma' }),
      listasBase({ membrosDaArea: [ANA_LIMA, BRUNO] }),
      null,
    );

    expect(resolucao.responsavelId).toBe(ANA_LIMA.id);
  });

  it('nome completo dito e não encontrado não vira o único homônimo de primeiro nome', () => {
    // "Ana Sousa" dita com Ana Lima na lista: a fallback de primeiro nome é só
    // para menção solta de uma palavra, não para aproximar nome completo errado.
    const resolucao = resolverTarefaDitada(
      sugestao({ responsavel_mencionado: 'Ana Sousa' }),
      listasBase({ membrosDaArea: [ANA_LIMA, BRUNO] }),
      null,
    );

    expect(resolucao.responsavelId).toBeNull();
  });

  it('responsável não mencionado fica vazio sem aviso', () => {
    const resolucao = resolverTarefaDitada(sugestao(), listasBase(), null);

    expect(resolucao.responsavelId).toBeNull();
    expect(resolucao.camposNaoResolvidos).not.toContain('responsavel');
  });
});

describe('horas estimadas', () => {
  it.each([
    [4, 4],
    [1.5, 1.5],
  ])('horas válidas (%p) passam direto', (entrada, esperado) => {
    const resolucao = resolverTarefaDitada(sugestao({ horas_estimadas: entrada }), listasBase(), null);
    expect(resolucao.horasEstimadas).toBe(esperado);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('horas inválidas (%p) viram null', (entrada) => {
    const resolucao = resolverTarefaDitada(sugestao({ horas_estimadas: entrada }), listasBase(), null);
    expect(resolucao.horasEstimadas).toBeNull();
  });
});

describe('mensagemCampoNaoResolvido', () => {
  it('segue o texto do plano, com a menção original', () => {
    expect(mensagemCampoNaoResolvido('responsavel', 'Ana')).toBe(
      'Não foi possível identificar com segurança o responsável “Ana”. Selecione-o antes de criar a tarefa.',
    );
    expect(mensagemCampoNaoResolvido('projeto', '  Recuperacao X  ')).toBe(
      'Não foi possível identificar com segurança o projeto “Recuperacao X”. Selecione-o antes de criar a tarefa.',
    );
  });
});
