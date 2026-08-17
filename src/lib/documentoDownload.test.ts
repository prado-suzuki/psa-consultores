import { describe, expect, it } from 'vitest';
import {
  agregarPorDocumento, agregarPorUsuario, buildDownloadsPorDocumentoCsv,
  buildDownloadsPorUsuarioCsv, SEM_USUARIO, type LinhaDownload,
} from '@/lib/documentoDownload';

/**
 * Espalha `over` POR CIMA do padrão, e não `over.x ?? padrao`: com `??` um
 * `baixado_por: null` explícito seria trocado pelo padrão e o caso do autor
 * ausente nunca exercitaria o ramo que ele existe para cobrir.
 */
function linha(over: Partial<LinhaDownload> = {}): LinhaDownload {
  return {
    id: 'ev-1',
    documento_id: 'doc-1',
    baixado_por: 'user-1',
    papel: 'equipe',
    acao: 'download',
    baixado_em: '2026-08-17T12:00:00.000Z',
    documento: { nome_original: 'contrato.pdf', categoria: 'societarios' },
    cliente: { nome: 'Cliente Um' },
    ...over,
  };
}

const NOMES = { 'user-1': 'Eduardo Nogueira', 'user-2': 'Patricia Melo' };

describe('agregarPorUsuario', () => {
  it('devolve lista vazia sem inventar linha', () => {
    expect(agregarPorUsuario([], NOMES)).toEqual([]);
  });

  it('soma dois acessos do mesmo usuário e guarda o instante mais recente', () => {
    const linhas = [
      linha({ id: 'ev-1', baixado_em: '2026-08-17T09:00:00.000Z' }),
      linha({ id: 'ev-2', baixado_em: '2026-08-17T18:30:00.000Z' }),
    ];

    const [resultado] = agregarPorUsuario(linhas, NOMES);

    expect(resultado.downloads).toBe(2);
    expect(resultado.ultimoEm).toBe('2026-08-17T18:30:00.000Z');
    // Mesmo documento nas duas linhas: dois acessos, um documento distinto.
    expect(resultado.documentosDistintos).toBe(1);
    expect(resultado.nome).toBe('Eduardo Nogueira');
  });

  it('a ordem de entrada não muda o instante mais recente', () => {
    const cedo = linha({ id: 'ev-1', baixado_em: '2026-08-17T09:00:00.000Z' });
    const tarde = linha({ id: 'ev-2', baixado_em: '2026-08-17T18:30:00.000Z' });

    expect(agregarPorUsuario([tarde, cedo], NOMES)[0].ultimoEm)
      .toBe(agregarPorUsuario([cedo, tarde], NOMES)[0].ultimoEm);
  });

  it('conta ação que não é download à parte, sem inflar a coluna de download', () => {
    const linhas = [
      linha({ id: 'ev-1', acao: 'download' }),
      linha({ id: 'ev-2', acao: 'preview' }),
    ];

    const [resultado] = agregarPorUsuario(linhas, NOMES);

    expect(resultado.downloads).toBe(1);
    expect(resultado.outrasAcoes).toBe(1);
  });

  // Os dois valores são os únicos que a função grava: o ramo da guarda que
  // autorizou o acesso, e não o cargo de quem baixou.
  it('junta as origens vistas no período, sem repetir a que apareceu duas vezes', () => {
    const linhas = [
      linha({ id: 'ev-1', papel: 'equipe' }),
      linha({ id: 'ev-2', papel: 'cliente' }),
      linha({ id: 'ev-3', papel: 'cliente' }),
    ];

    expect(agregarPorUsuario(linhas, NOMES)[0].papeis).toEqual(['cliente', 'equipe']);
  });

  it('mostra o identificador quando o perfil não está na lista visível', () => {
    const [resultado] = agregarPorUsuario([linha({ baixado_por: 'user-99' })], NOMES);

    expect(resultado.nome).toBe('user-99');
  });

  it('agrupa o autor ausente num balde próprio em vez de descartar a linha', () => {
    const [resultado] = agregarPorUsuario([linha({ baixado_por: null })], NOMES);

    expect(resultado.usuarioId).toBe(SEM_USUARIO);
    expect(resultado.nome).toBe('Não identificado');
    expect(resultado.downloads).toBe(1);
  });

  it('ordena por downloads, do maior para o menor', () => {
    const linhas = [
      linha({ id: 'ev-1', baixado_por: 'user-2' }),
      linha({ id: 'ev-2', baixado_por: 'user-1' }),
      linha({ id: 'ev-3', baixado_por: 'user-1' }),
    ];

    expect(agregarPorUsuario(linhas, NOMES).map(l => l.usuarioId)).toEqual(['user-1', 'user-2']);
  });
});

describe('agregarPorDocumento', () => {
  it('devolve lista vazia sem inventar linha', () => {
    expect(agregarPorDocumento([])).toEqual([]);
  });

  it('conta usuários distintos e mantém o documento numa linha só', () => {
    const linhas = [
      linha({ id: 'ev-1', baixado_por: 'user-1' }),
      linha({ id: 'ev-2', baixado_por: 'user-2' }),
      linha({ id: 'ev-3', baixado_por: 'user-2' }),
    ];

    const resultado = agregarPorDocumento(linhas);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].downloads).toBe(3);
    expect(resultado[0].usuariosDistintos).toBe(2);
  });

  it('mantém a linha do documento sem embutido, que é o caso do documento excluído', () => {
    const [resultado] = agregarPorDocumento([
      linha({ documento: null, cliente: null }),
    ]);

    expect(resultado.documentoId).toBe('doc-1');
    expect(resultado.nome).toBeNull();
    expect(resultado.cliente).toBeNull();
    expect(resultado.downloads).toBe(1);
  });

  it('o embutido de uma linha vale para o documento inteiro, e a ausência não o apaga', () => {
    const [resultado] = agregarPorDocumento([
      linha({ id: 'ev-1', documento: null, cliente: null }),
      linha({ id: 'ev-2' }),
    ]);

    expect(resultado.nome).toBe('contrato.pdf');
    expect(resultado.cliente).toBe('Cliente Um');
  });
});

describe('CSV', () => {
  it('escapa o campo que tem o próprio separador', () => {
    const csv = buildDownloadsPorUsuarioCsv(
      agregarPorUsuario([linha({ baixado_por: 'user-3' })], { 'user-3': 'Melo; Patricia' }),
    );

    expect(csv.split('\n')[1]).toContain('"Melo; Patricia"');
  });

  it('sai só o cabeçalho quando não há linha', () => {
    expect(buildDownloadsPorDocumentoCsv([]).split('\n')).toHaveLength(1);
  });

  // O CSV é o artefato que sai da empresa; divergir de vocabulário da tela
  // faria duas pessoas discutirem o mesmo número com nomes diferentes.
  it('usa na origem o mesmo rótulo que a tela mostra, não o valor cru', () => {
    const csv = buildDownloadsPorUsuarioCsv(
      agregarPorUsuario([linha({ papel: 'cliente' })], NOMES),
    );

    expect(csv.split('\n')[0]).toContain('origem_do_acesso');
    expect(csv.split('\n')[1]).toContain('Portal do cliente');
    expect(csv.split('\n')[1]).not.toContain(';cliente;');
  });

  it('leva o identificador junto do nome, para dar o que procurar', () => {
    const csv = buildDownloadsPorDocumentoCsv(agregarPorDocumento([linha()]));

    expect(csv).toContain('contrato.pdf');
    expect(csv).toContain('doc-1');
  });
});
