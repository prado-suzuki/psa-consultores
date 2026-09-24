// A tela que hospeda os DOIS geradores e junta o resultado num aviso só.
//
// É aqui que mora o defeito de 18/09/2026: com `TOAST_LIMIT = 1`, cada geração
// dava o seu toast e o segundo apagava o primeiro — quem marcava as três peças
// via o aviso de sucesso enquanto dois dos três arquivos não tinham vindo. O
// conserto foi juntar os resultados e avisar uma vez; estes testes são o que
// impede a volta, e o `disparar()` continuou sem cobertura até 21/09.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const avisos = vi.hoisted(() => ({ toast: vi.fn() }));
const osg = vi.hoisted(() => ({
  gerar: vi.fn(), tributaria: vi.fn(), baixar: vi.fn(),
  /* O que a tela entregou ao hook da `gerar-apresentacao` como simulações do capítulo 04. */
  simulacaoIds: [] as readonly string[],
}));
/* Os cenários do capítulo 04, vazios por padrão: só entram nos casos que marcam a peça. */
const cenarios = vi.hoisted(() => ({
  valor: { simulacaoIds: [] as string[], slides: 0, carregando: false, conflitoDeUpf: null as string | null },
}));
/* A contagem por peça: cada caso parte daqui e muda o que precisar. */
const contagem = vi.hoisted(() => ({
  valor: { patrimonial: 3, societaria: 2, carregando: false },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: avisos.toast }));
vi.mock('@/contexts/OsgWorkContext', () => ({ useOsgWork: () => ({ clienteId: 'cli-1' }) }));
vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/equipe/osg/relatorios/EscolhaDaRevisao', () => ({
  EscolhaDaRevisao: () => <span>revisão</span>,
}));
vi.mock('@/components/equipe/osg/relatorios/useContagemDeSlides', () => ({
  useContagemDeSlides: () => contagem.valor,
  SLIDES_DO_TRIBUTARIO: 5,
}));
vi.mock('@/components/equipe/osg/relatorios/useRevisaoParaSlides', () => ({
  useRevisaoParaSlides: () => ({ revisaoId: 'rev-1', carregando: false }),
}));
vi.mock('@/hooks/useDomainPapelDeTrabalho', () => ({
  useGerarApresentacaoTributaria: () => ({ mutateAsync: osg.tributaria, isPending: false }),
}));
vi.mock('@/components/equipe/osg/relatorios/EscolhaDosCenarios', () => ({
  EscolhaDosCenarios: () => <span>cenários</span>,
}));
vi.mock('@/components/equipe/osg/relatorios/useCenariosParaSlides', () => ({
  useCenariosParaSlides: () => cenarios.valor,
}));
vi.mock('@/hooks/useGerarApresentacao', () => ({
  useGerarApresentacao: (_clienteId: string | null, simulacaoIds: readonly string[] = []) => {
    osg.simulacaoIds = simulacaoIds;
    return { mutateAsync: osg.gerar, isPending: false };
  },
}));
vi.mock('@/lib/osg/baixarArquivoPorUrl', () => ({ baixarArquivoPorUrl: osg.baixar }));

import BibliotecaApresentacoes from '@/pages/equipe/osg/BibliotecaApresentacoes';

/** O resultado dos dois decks da OSG, como o hook devolve. */
const doisDecks = {
  arquivos: [
    { tipo: 'patrimonial' as const, nome: 'DP.pptx' },
    { tipo: 'societaria' as const, nome: 'QS.pptx' },
  ],
  erro: null,
  problemas: [],
  errosPorDeck: [],
};

/** Os três decks da `gerar-apresentacao`, com o capítulo 04. */
const tresDecks = {
  ...doisDecks,
  arquivos: [...doisDecks.arquivos, { tipo: 'sucessoria' as const, nome: 'SUC.pptx' }],
};

/** O texto de todos os toasts disparados, junto. */
const ditoAoUsuario = () =>
  avisos.toast.mock.calls.map((c) => `${c[0].title} ${c[0].description ?? ''}`).join(' | ');

async function gerar() {
  render(<BibliotecaApresentacoes />);
  await userEvent.click(screen.getByRole('button', { name: /Gerar apresentações/i }));
  await waitFor(() => expect(avisos.toast).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  contagem.valor = { patrimonial: 3, societaria: 2, carregando: false };
  cenarios.valor = { simulacaoIds: [], slides: 0, carregando: false, conflitoDeUpf: null };
  osg.simulacaoIds = [];
  osg.gerar.mockResolvedValue(doisDecks);
  osg.tributaria.mockResolvedValue({
    url: 'https://x/deck.pptx', nomeArquivo: 'PT.pptx', versao: 1, problemas: [],
  });
  osg.baixar.mockResolvedValue(undefined);
});

describe('um aviso só, sempre', () => {
  // O caso do defeito: dois geradores, um toast. Mais de um e o `TOAST_LIMIT`
  // apaga o primeiro.
  it('as três peças com sucesso dão UM toast, nomeando os três arquivos', async () => {
    await gerar();
    expect(avisos.toast).toHaveBeenCalledTimes(1);
    expect(ditoAoUsuario()).toContain('DP.pptx');
    expect(ditoAoUsuario()).toContain('QS.pptx');
    expect(ditoAoUsuario()).toContain('PT.pptx');
  });

  it('os dois geradores falhando também dão UM toast, e destrutivo', async () => {
    osg.gerar.mockResolvedValue({ arquivos: [], erro: 'servidor fora', problemas: [], errosPorDeck: [] });
    osg.tributaria.mockRejectedValue(new Error('revisão sumiu'));
    await gerar();

    expect(avisos.toast).toHaveBeenCalledTimes(1);
    expect(avisos.toast.mock.calls[0][0].variant).toBe('destructive');
    expect(ditoAoUsuario()).toContain('servidor fora');
    expect(ditoAoUsuario()).toContain('revisão sumiu');
  });

  // O sucesso parcial é o que o defeito escondia: o toast verde do tributário
  // cobria a falha silenciosa dos dois decks da OSG.
  it('sucesso parcial não vira sucesso: diz quantas de quantas', async () => {
    osg.gerar.mockResolvedValue({ arquivos: [], erro: 'deu ruim', problemas: [], errosPorDeck: [] });
    await gerar();

    expect(avisos.toast.mock.calls[0][0].variant).toBe('destructive');
    expect(ditoAoUsuario()).toMatch(/1 de 3/);
    expect(ditoAoUsuario()).toContain('PT.pptx');
  });
});

describe('o motivo que chega ao usuário', () => {
  it('o erro daquele deck vence o genérico', async () => {
    osg.gerar.mockResolvedValue({
      arquivos: [{ tipo: 'patrimonial' as const, nome: 'DP.pptx' }],
      erro: null,
      problemas: [],
      errosPorDeck: [{ tipo: 'societaria' as const, message: 'Template ausente: TEMPLATE_CAP02_SOCIETARIA.pptx' }],
    });
    await gerar();

    expect(ditoAoUsuario()).toContain('Template ausente: TEMPLATE_CAP02_SOCIETARIA.pptx');
    expect(ditoAoUsuario()).not.toContain('não devolveu o arquivo');
  });

  // O conserto da OSG é no cadastro; o do tributário é no PowerPoint. Textos
  // diferentes de propósito — um manda ao lugar errado se copiar o outro.
  it('problema de cadastro manda ao cadastro, e cita os pontos', async () => {
    osg.gerar.mockResolvedValue({
      ...doisDecks,
      problemas: [
        { tipo: 'origem', onde: 'Quadro Societário', detalhe: '"Sinop Sementes" ficou fora.' },
        { tipo: 'origem', onde: 'Organograma', detalhe: 'Titular em placeholder.' },
      ],
    });
    await gerar();

    expect(ditoAoUsuario()).toContain('Confira no cadastro');
    expect(ditoAoUsuario()).toContain('Sinop Sementes');
  });

  it('acima de dois pontos, resume o resto em vez de despejar', async () => {
    osg.gerar.mockResolvedValue({
      ...doisDecks,
      problemas: [1, 2, 3, 4, 5].map((n) => ({
        tipo: 'origem' as const, onde: 'Quadro Societário', detalhe: `ponto ${n}.`,
      })),
    });
    await gerar();

    expect(ditoAoUsuario()).toContain('ponto 1');
    expect(ditoAoUsuario()).toContain('+3 pontos');
    expect(ditoAoUsuario()).not.toContain('ponto 5');
  });

  it('sem problema nenhum, nada de "confira no cadastro"', async () => {
    await gerar();
  });
});

describe('o que vai para o servidor', () => {
  // Vai a lista do que foi marcado, e não um `tipo` só.
  it('manda só o que foi marcado', async () => {
    render(<BibliotecaApresentacoes />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Quadro Societário e Organograma' }));
    await userEvent.click(screen.getByRole('button', { name: /Gerar apresentações/i }));
    await waitFor(() => expect(osg.gerar).toHaveBeenCalled());

    expect(osg.gerar).toHaveBeenCalledWith(['patrimonial']);
  });

  it('as duas peças da OSG marcadas vão juntas, numa chamada só', async () => {
    await gerar();
    expect(osg.gerar).toHaveBeenCalledTimes(1);
    expect(osg.gerar).toHaveBeenCalledWith(['patrimonial', 'societaria']);
  });
});

/* O CAPÍTULO 04 É DECK DA `gerar-apresentacao`, como o 01 e o 02: vai na MESMA chamada,
   e o que ele tem a mais — as simulações escolhidas — chega ao hook, não à chamada. */
describe('o capítulo 04 — Organização Sucessória', () => {
  it('sem simulação aprovada marcada, a peça fica sem dados e não vai ao servidor', async () => {
    await gerar();
    expect(osg.gerar).toHaveBeenCalledWith(['patrimonial', 'societaria']);
    expect(screen.getAllByText('sem dados')).toHaveLength(1);
  });

  it('com cenários, vai na mesma chamada dos outros decks, com os ids na ordem dos cenários', async () => {
    cenarios.valor = { simulacaoIds: ['V2', 'V4', 'V6'], slides: 19, carregando: false, conflitoDeUpf: null };
    osg.gerar.mockResolvedValue(tresDecks);
    await gerar();

    expect(osg.gerar).toHaveBeenCalledTimes(1);
    expect(osg.gerar).toHaveBeenCalledWith(['patrimonial', 'societaria', 'sucessoria']);
    expect(osg.simulacaoIds).toEqual(['V2', 'V4', 'V6']);
    expect(avisos.toast).toHaveBeenCalledTimes(1);
    expect(ditoAoUsuario()).toContain('SUC.pptx');
    expect(ditoAoUsuario()).toContain('PT.pptx');
    expect(screen.getByText('19')).toBeInTheDocument();
  });

  it('o motivo do servidor para o capítulo chega ao usuário, e o resto sai', async () => {
    cenarios.valor = { simulacaoIds: ['V6'], slides: 12, carregando: false, conflitoDeUpf: null };
    osg.gerar.mockResolvedValue({
      ...doisDecks,
      errosPorDeck: [{ tipo: 'sucessoria' as const, message: '"Cenário III" não está aprovada.' }],
    });
    await gerar();

    expect(avisos.toast.mock.calls[0][0].variant).toBe('destructive');
    expect(ditoAoUsuario()).toContain('Organização Sucessória: "Cenário III" não está aprovada.');
    expect(ditoAoUsuario()).toContain('DP.pptx');
  });
});

describe('sem cliente na barra', () => {
  it('a tela pede para escolher um, e não oferece o botão', async () => {
    vi.doMock('@/contexts/OsgWorkContext', () => ({ useOsgWork: () => ({ clienteId: null }) }));
    vi.resetModules();
    const { default: Tela } = await import('@/pages/equipe/osg/BibliotecaApresentacoes');
    render(<Tela />);

    expect(screen.getByText(/Selecione um cliente/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gerar apresentações/i })).toBeNull();
  });
});

describe('o capítulo 04 com UPFs diferentes', () => {
  /* Erro de preenchimento: a tela recusa antes do clique e diz o que fazer. */
  it('a peça não se marca, diz por quê, e não vai para o servidor', async () => {
    cenarios.valor = {
      simulacaoIds: ['V2', 'V6'], slides: 20, carregando: false,
      conflitoDeUpf: 'As simulações marcadas usam UPFs diferentes. Gere uma nova simulação na Calculadora de ITCMD com a mesma UPF das outras e aprove-a.',
    };
    osg.gerar.mockResolvedValue(doisDecks);
    render(<BibliotecaApresentacoes />);

    expect(screen.getByRole('checkbox', { name: 'Organização Sucessória' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Gere uma nova simulação');
    await userEvent.click(screen.getByRole('button', { name: /Gerar apresentações/i }));
    await waitFor(() => expect(osg.gerar).toHaveBeenCalled());
    expect(osg.gerar).toHaveBeenCalledWith(['patrimonial', 'societaria']);
  });
});
