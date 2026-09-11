import { describe, expect, it } from 'vitest';
import { renderizarVersao, realcarMudancas, type SnapshotVersoes } from '@/components/equipe/osg/gerar/renderizarVersao';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import type { Bloco } from '@/lib/templates';

const bloco = (conteudo: string): Bloco => ({ id: 'posicao', conteudo, obrigatorio: true });
const dados = (extra: Partial<SnapshotDados> = {}): SnapshotDados => ({
  selecao: {}, registroPorBinding: {}, valoresLivres: {}, empresaId: null, itensPorLista: {}, total: null, ...extra,
});

describe('renderizarVersao: caracterizacao', () => {
  it('le blocos legados e valores livres persistidos', () => {
    expect(renderizarVersao([bloco('Texto {{ nota }}')], [], dados({ valoresLivres: { nota: 'salva' } })))
      .toMatchObject({ texto: 'Texto salva', erro: null });
  });

  it('preserva lista explicitamente vazia e nao realca sem baseline', () => {
    const render = renderizarVersao([bloco('{{#signatarios}}{{ signatario.nome }}{{/signatarios}}')], [], dados({ itensPorLista: { signatarios: [] } }));
    expect(render).toMatchObject({ blocos: [], texto: '', erro: null });
    expect(realcarMudancas(render.blocos, null)).toBe(render.blocos);
  });

  it('respeita flags congeladas', () => {
    expect(renderizarVersao([{ ...bloco('Condicional'), obrigatorio: false, flagsRequeridas: ['evento'] }], [], dados()).texto).toBe('');
  });
});

describe('renderizarVersao: snapshot insuficiente', () => {
  it.each<{ snapshot: SnapshotVersoes | null }>([{ snapshot: null }, { snapshot: [] }])('nao apresenta snapshot sem blocos como documento vazio valido', ({ snapshot }) => {
    expect(renderizarVersao(snapshot, [], dados()).erro).toMatch(/snapshot/i);
  });

  it('nao inventa flags ausentes', () => {
    expect(renderizarVersao([bloco('Texto')], null, dados()).erro).toMatch(/flags/i);
  });

  it('nao transforma lista ausente em lista vazia', () => {
    expect(renderizarVersao([bloco('{{#signatarios}}{{ signatario.nome }}{{/signatarios}}')], [], dados()).erro).toMatch(/signatarios/i);
  });

  it('nao inventa valor livre ausente', () => {
    expect(renderizarVersao([bloco('{{ nota }}')], [], dados()).erro).toMatch(/nota/i);
  });
});

describe('renderizarVersao: contexto completo', () => {
  it('reproduz derivados, familias e georef depois do round-trip sem usar snapshot_dados divergente', () => {
    const snapshot: SnapshotVersoes = {
      blocos: [bloco('{{ retirada.verbo }} {{#sociedade.temAdministradorNaoSocio}}externo{{/sociedade.temAdministradorNaoSocio}} {{ imovel.georefArea }} {{familia nome="assinatura"}}')],
      familias: { assinatura: [{ id: 'variante', rotulo: null, ordem: 1, seletor: {}, conteudo: '{{#signatarios}}{{ signatario.nome }}{{/signatarios}}' }] },
      contextoRender: { retirada: { verbo: 'retiram-se' }, sociedade: { temAdministradorNaoSocio: 'sim' }, imovel: { georefArea: '100 ha' }, signatarios: [{ signatario: { nome: 'Ana' } }] },
    };
    const salvo = JSON.parse(JSON.stringify(snapshot)) as SnapshotVersoes;
    const antes = JSON.stringify(salvo);
    const render = renderizarVersao(salvo, [], dados({ selecao: { imovel: { georefArea: '999 ha' } } }));
    expect(render).toMatchObject({ erro: null, texto: 'retiram-se externo 100 ha Ana' });
    expect(JSON.stringify(salvo)).toBe(antes);
    expect(renderizarVersao(salvo, [], null)).toEqual(render);
  });

  it('nao infere flag de constituicao numa versao legada', () => {
    expect(renderizarVersao([{ ...bloco('Constituicao'), obrigatorio: false, flagsRequeridas: ['e_constituicao'] }], [], dados()).texto).toBe('');
  });

  it.each(['{{#ausente}}Texto{{/ausente}}', '{{familia nome="ausente"}}', '{{ ausente }}'])('rejeita contexto incompleto: %s', (conteudo) => {
    const render = renderizarVersao({ blocos: [bloco(conteudo)], contextoRender: {} }, [], null);
    expect(render.erro).toMatch(/ausente/i);
    expect(render.blocos).toEqual([]);
  });

  it('nao exige campos do ramo explicitamente falso', () => {
    expect(renderizarVersao({ blocos: [bloco('Texto{{#opcional}}{{ ausente }}{{/opcional}}')], contextoRender: { opcional: '' } }, [], null))
      .toMatchObject({ erro: null, texto: 'Texto' });
  });

  it('religa referencias entre repetidores sem modificar o snapshot recebido', () => {
    const primeiro = { socio: { nome: 'Ana', ordem: '1' }, referencia: false };
    const snapshot: SnapshotVersoes = JSON.parse(JSON.stringify({
      blocos: [
        { ...bloco('Capital'), id: 'capital', tipo: 'clausula' },
        { ...bloco('{{ socio.nome }}{{#referencia}}: {{ refItem.ref }}{{/referencia}}'), tipo: 'paragrafo', repeteColecao: 'integralizacoes' },
      ],
      contextoRender: { integralizacoes: [primeiro, { socio: { nome: 'Bia', ordem: '2' }, referencia: true, refItem: primeiro }] },
    }));
    const antes = JSON.stringify(snapshot);
    const render = renderizarVersao(snapshot, [], null);
    expect(render.erro).toBeNull();
    expect(render.texto).toContain('Bia: parágrafo primeiro');
    expect(JSON.stringify(snapshot)).toBe(antes);
    expect(renderizarVersao(snapshot, [], null)).toEqual(render);
  });

  it('nao usa variante padrao para encobrir seletor ausente', () => {
    const render = renderizarVersao({
      blocos: [bloco('{{familia nome="imovel"}}')], contextoRender: {},
      familias: { imovel: [
        { id: 'rural', rotulo: null, ordem: 1, seletor: { 'imovel.rural': 'sim' }, conteudo: 'Rural' },
        { id: 'padrao', rotulo: null, ordem: 2, seletor: {}, conteudo: 'Outro' },
      ] },
    }, [], null);
    expect(render.erro).toMatch(/imovel.rural/);
  });
});
