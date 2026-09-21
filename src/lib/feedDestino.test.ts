import { describe, expect, it } from 'vitest';

import {
  alvoDoDestino,
  aoEscolherCliente,
  aoEscolherProjeto,
  destinoDosFiltros,
  DESTINO_VAZIO,
  falaCabeNoRecorte,
  mencoesPermitidas,
} from '@/lib/feedDestino';
import { FILTROS_VAZIOS, type ProjetoDoFiltro } from '@/lib/feedFiltros';

const PROJETOS: ProjetoDoFiltro[] = [
  { id: 'p1', name: 'Recuperação PIS/COFINS', external_client_id: 'c1' },
  { id: 'p2', name: 'Holding rural', external_client_id: 'c2' },
];

describe('alvoDoDestino', () => {
  it('sem projeto não há destino', () => {
    expect(alvoDoDestino(DESTINO_VAZIO)).toBeNull();
    expect(alvoDoDestino({ clienteId: 'c1', projetoId: null, tarefaId: null })).toBeNull();
  });

  it('projeto sem tarefa publica no próprio projeto', () => {
    expect(alvoDoDestino({ clienteId: 'c1', projetoId: 'p1', tarefaId: null })).toEqual({
      entityType: 'org_project',
      entityId: 'p1',
      projectId: 'p1',
    });
  });

  it('com tarefa publica na tarefa, mas o projeto continua carimbado', () => {
    expect(alvoDoDestino({ clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' })).toEqual({
      entityType: 'org_task',
      entityId: 't9',
      projectId: 'p1',
    });
  });
});

describe('aoEscolherCliente', () => {
  it('derruba projeto e tarefa quando o projeto era de outro cliente', () => {
    const destino = { clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' };

    expect(aoEscolherCliente(destino, 'c2', PROJETOS)).toEqual({
      clienteId: 'c2',
      projetoId: null,
      tarefaId: null,
    });
  });

  it('preserva o destino quando o projeto é do cliente escolhido', () => {
    const destino = { clienteId: null, projetoId: 'p2', tarefaId: 't3' };

    expect(aoEscolherCliente(destino, 'c2', PROJETOS)).toEqual({
      clienteId: 'c2',
      projetoId: 'p2',
      tarefaId: 't3',
    });
  });

  it('preserva projeto que não está na lista — ela pode não ter chegado', () => {
    const destino = { clienteId: 'c1', projetoId: 'desconhecido', tarefaId: 't9' };

    expect(aoEscolherCliente(destino, 'c2', PROJETOS)).toEqual({
      clienteId: 'c2',
      projetoId: 'desconhecido',
      tarefaId: 't9',
    });
  });

  it('limpar o cliente não mexe no que já estava escolhido', () => {
    const destino = { clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' };

    expect(aoEscolherCliente(destino, null, PROJETOS)).toEqual({ ...destino, clienteId: null });
  });
});

describe('aoEscolherProjeto', () => {
  it('trocar de projeto derruba a tarefa e traz o cliente do projeto novo', () => {
    expect(
      aoEscolherProjeto({ clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' }, 'p2', PROJETOS),
    ).toEqual({
      clienteId: 'c2',
      projetoId: 'p2',
      tarefaId: null,
    });
  });

  it('projeto sem cliente na linha mantém o cliente que estava', () => {
    const semCliente: ProjetoDoFiltro[] = [{ id: 'p9', name: 'Pela OS', external_client_id: null }];

    expect(aoEscolherProjeto({ clienteId: 'c1', projetoId: null, tarefaId: null }, 'p9', semCliente))
      .toEqual({ clienteId: 'c1', projetoId: 'p9', tarefaId: null });
  });

  it('reescolher o mesmo projeto mantém a tarefa', () => {
    const destino = { clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' };

    expect(aoEscolherProjeto(destino, 'p1', PROJETOS)).toBe(destino);
  });

  it('limpar o projeto derruba a tarefa junto, e o cliente fica', () => {
    expect(
      aoEscolherProjeto({ clienteId: 'c1', projetoId: 'p1', tarefaId: 't9' }, null, PROJETOS),
    ).toEqual({
      clienteId: 'c1',
      projetoId: null,
      tarefaId: null,
    });
  });
});

describe('destinoDosFiltros', () => {
  it('feed sem recorte abre o compositor vazio', () => {
    expect(destinoDosFiltros(FILTROS_VAZIOS, PROJETOS)).toEqual(DESTINO_VAZIO);
  });

  it('recorte de cliente vira o cliente do destino', () => {
    expect(destinoDosFiltros({ ...FILTROS_VAZIOS, clienteId: 'c2' }, PROJETOS)).toEqual({
      clienteId: 'c2',
      projetoId: null,
      tarefaId: null,
    });
  });

  it('recorte de projeto traz o cliente dele junto', () => {
    expect(destinoDosFiltros({ ...FILTROS_VAZIOS, projetoId: 'p2' }, PROJETOS)).toEqual({
      clienteId: 'c2',
      projetoId: 'p2',
      tarefaId: null,
    });
  });

  it('projeto fora da lista entra sem cliente, e não quebra', () => {
    expect(destinoDosFiltros({ ...FILTROS_VAZIOS, projetoId: 'pX' }, PROJETOS)).toEqual({
      clienteId: null,
      projetoId: 'pX',
      tarefaId: null,
    });
  });

  it('nunca adivinha tarefa — o feed não tem esse filtro', () => {
    expect(destinoDosFiltros({ ...FILTROS_VAZIOS, projetoId: 'p1' }, PROJETOS).tarefaId).toBeNull();
  });
});

describe('mencoesPermitidas', () => {
  it('descarta quem não está na roda do projeto atual', () => {
    expect(mencoesPermitidas(['u1', 'u-de-outro-projeto'], [{ id: 'u1' }, { id: 'u2' }])).toEqual([
      'u1',
    ]);
  });

  it('sem candidatos carregados, nenhuma menção é notificada', () => {
    expect(mencoesPermitidas(['u1'], [])).toEqual([]);
  });
});

describe('falaCabeNoRecorte', () => {
  const fala = {
    projetoId: 'p1',
    clienteId: 'c1',
    autorId: 'eu',
    mencionados: [] as string[],
  };

  it('feed sem recorte sempre mostra a fala', () => {
    expect(falaCabeNoRecorte(FILTROS_VAZIOS, fala)).toBe(true);
  });

  it('projeto de outro recorte fica de fora', () => {
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, projetoId: 'p2' }, fala)).toBe(false);
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, projetoId: 'p1' }, fala)).toBe(true);
  });

  it('cliente de outro recorte fica de fora', () => {
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, clienteId: 'c2' }, fala)).toBe(false);
  });

  it('cliente desconhecido não é tratado como fora', () => {
    // O vínculo pode vir da ordem de serviço, que o compositor não lê.
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, clienteId: 'c2' }, { ...fala, clienteId: null }))
      .toBe(true);
  });

  it('recorte por outro autor fica de fora', () => {
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, autorId: 'outra-pessoa' }, fala)).toBe(false);
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, autorId: 'eu' }, fala)).toBe(true);
  });

  it('em "só menções", a própria fala só aparece se ela mencionar quem escreveu', () => {
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, apenasMencoes: true }, fala)).toBe(false);
    expect(
      falaCabeNoRecorte({ ...FILTROS_VAZIOS, apenasMencoes: true }, {
        ...fala,
        mencionados: ['eu'],
      }),
    ).toBe(true);
  });

  it('o período não tira do recorte: a fala acabou de nascer', () => {
    expect(falaCabeNoRecorte({ ...FILTROS_VAZIOS, periodo: 'hoje' }, fala)).toBe(true);
  });
});
