import { describe, expect, it } from 'vitest';
import {
  agruparPorGrupo,
  encontrarItemDoCatalogo,
  GRANULARIDADES,
  grupoSugeridoParaGranularidade,
  montarAtualizacaoItem,
  montarReativacaoItem,
  montarItemDeCatalogo,
  montarItemManual,
  ordenarItens,
  paraGranularidade,
  resolverItem,
  type CatalogoDocumento,
  type SolicitacaoItemRow,
} from './solicitacao';

const catalogo = (overrides: Partial<CatalogoDocumento> = {}): CatalogoDocumento => ({
  id: 'cat-1',
  codigo: 'RG',
  documento: 'RG',
  entidade: 'Pessoa Física',
  nota: 'Frente e verso',
  granularidade: 'pessoa_pf',
  grupo: 'pf',
  ordem: 10,
  confidencial: false,
  ...overrides,
});

const linha = (overrides: Partial<SolicitacaoItemRow> = {}): SolicitacaoItemRow => ({
  id: 'item-1',
  item_padrao_id: 'cat-1',
  granularidade: 'pessoa_pf',
  grupo: 'pf',
  documento: null,
  entidade: null,
  nota: null,
  status: 'ativo',
  ordem: 10,
  observacao: null,
  catalogo: catalogo(),
  ...overrides,
});

describe('resolverItem', () => {
  it('herda documento, entidade e nota do catálogo quando a linha está nula', () => {
    const item = resolverItem(linha());

    expect(item.documento).toBe('RG');
    expect(item.entidade).toBe('Pessoa Física');
    expect(item.nota).toBe('Frente e verso');
    expect(item.sobrescrito).toEqual({ documento: false, entidade: false, nota: false });
    expect(item.doCatalogo).toBe(true);
    expect(item.codigo).toBe('RG');
  });

  it('marca como sobrescrito só o campo preenchido na linha', () => {
    const item = resolverItem(linha({ nota: 'Só o verso, legível' }));

    expect(item.nota).toBe('Só o verso, legível');
    expect(item.documento).toBe('RG');
    expect(item.sobrescrito).toEqual({ documento: false, entidade: false, nota: true });
  });

  it('resolve o item manual pelo texto da própria linha', () => {
    const item = resolverItem(linha({
      id: 'item-2',
      item_padrao_id: null,
      catalogo: null,
      documento: 'Contrato de arrendamento',
      entidade: 'Cliente',
      nota: null,
      grupo: 'outros',
      granularidade: 'cliente',
    }));

    expect(item.doCatalogo).toBe(false);
    expect(item.documento).toBe('Contrato de arrendamento');
    expect(item.nota).toBeNull();
    expect(item.codigo).toBeNull();
  });

  it('levanta quando a linha aponta para o catálogo mas veio sem o join', () => {
    expect(() => resolverItem(linha({ catalogo: null })))
      .toThrow(/sem o documento_tipo embarcado/);
  });

  it('levanta quando não há documento nem na linha nem no catálogo', () => {
    expect(() => resolverItem(linha({ item_padrao_id: null, catalogo: null })))
      .toThrow(/não tem documento/);
  });

  it('levanta quando a granularidade está fora do domínio do CHECK', () => {
    expect(() => resolverItem(linha({ granularidade: 'imovel' })))
      .toThrow(/fora do domínio/);
    expect(paraGranularidade('matricula_rural')).toBe('matricula_rural');
  });
});

describe('grupoSugeridoParaGranularidade', () => {
  it('sugere a gaveta pelo grão, com os dois tipos de matrícula no mesmo lugar', () => {
    expect(grupoSugeridoParaGranularidade('pessoa_pf')).toBe('pf');
    expect(grupoSugeridoParaGranularidade('pessoa_pj')).toBe('pj');
    expect(grupoSugeridoParaGranularidade('matricula_rural')).toBe('bens_imoveis');
    expect(grupoSugeridoParaGranularidade('matricula_urbana')).toBe('bens_imoveis');
    expect(grupoSugeridoParaGranularidade('cliente')).toBe('outros');
  });

  it('sugere para todos os grãos do domínio — a sugestão nunca fica indefinida', () => {
    for (const granularidade of GRANULARIDADES) {
      expect(grupoSugeridoParaGranularidade(granularidade)).toBeTruthy();
    }
  });
});

describe('ordenarItens e agruparPorGrupo', () => {
  const itens = [
    resolverItem(linha({ id: 'b', ordem: 20, catalogo: catalogo({ documento: 'CNH' }) })),
    resolverItem(linha({ id: 'a', ordem: 10, catalogo: catalogo({ documento: 'RG' }) })),
    resolverItem(linha({
      id: 'c',
      ordem: 10,
      grupo: 'bens_imoveis',
      granularidade: 'matricula_rural',
      catalogo: catalogo({ documento: 'Matrícula', grupo: 'bens_imoveis' }),
    })),
  ];

  it('ordena por ordem e desempata pelo texto resolvido', () => {
    expect(ordenarItens(itens).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('agrupa pela chave do enum do banco, preservando a ordem dentro do grupo', () => {
    const grupos = agruparPorGrupo(itens);

    expect([...grupos.keys()]).toEqual(['bens_imoveis', 'pf']);
    expect(grupos.get('pf')?.map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('montarItemDeCatalogo', () => {
  it('não copia texto do catálogo e não gera id no cliente', () => {
    const payload = montarItemDeCatalogo('sol-1', catalogo());

    expect(payload).toEqual({
      solicitacao_id: 'sol-1',
      item_padrao_id: 'cat-1',
      granularidade: 'pessoa_pf',
      grupo: 'pf',
      ordem: 10,
      status: 'ativo',
    });
    // Explícito porque é a regra que esta frente inteira existe para proteger:
    // texto na linha significa sobrescrita deliberada, e o id é do banco.
    expect(payload).not.toHaveProperty('documento');
    expect(payload).not.toHaveProperty('entidade');
    expect(payload).not.toHaveProperty('nota');
    expect(payload).not.toHaveProperty('id');
  });

  it('respeita a gaveta e o grão trocados no modal, sem passar a copiar texto', () => {
    const payload = montarItemDeCatalogo('sol-1', catalogo(), {
      grupo: 'outros',
      granularidade: 'cliente',
    });

    expect(payload.grupo).toBe('outros');
    expect(payload.granularidade).toBe('cliente');
    expect(payload).not.toHaveProperty('documento');
    expect(payload).not.toHaveProperty('nota');
  });
});

describe('montarItemManual', () => {
  it('grava o texto na linha, com item_padrao_id nulo', () => {
    const payload = montarItemManual('sol-1', {
      documento: '  Contrato de arrendamento  ',
      granularidade: 'cliente',
      grupo: 'outros',
      entidade: ' Cliente ',
      nota: '   ',
    });

    expect(payload).toEqual({
      solicitacao_id: 'sol-1',
      item_padrao_id: null,
      granularidade: 'cliente',
      grupo: 'outros',
      documento: 'Contrato de arrendamento',
      entidade: 'Cliente',
      nota: null,
      ordem: 0,
      status: 'ativo',
    });
  });

  it('recusa documento vazio', () => {
    expect(() => montarItemManual('sol-1', {
      documento: '   ',
      granularidade: 'cliente',
      grupo: 'outros',
    })).toThrow(/nome do documento/);
  });
});

describe('reativação de item dispensado', () => {
  const dispensado = resolverItem(linha({ status: 'dispensado', observacao: 'não se aplica' }));

  it('encontra o item de catálogo que já está na solicitação, mesmo dispensado', () => {
    expect(encontrarItemDoCatalogo([dispensado], 'cat-1')?.status).toBe('dispensado');
    expect(encontrarItemDoCatalogo([dispensado], 'cat-9')).toBeUndefined();
  });

  it('volta o item para ativo e apaga o motivo da dispensa', () => {
    // Apagar o motivo é o ponto: ele descrevia um estado que terminou. Manter
    // afirmaria que um item ativo tem motivo de dispensa.
    expect(montarReativacaoItem()).toEqual({ status: 'ativo', observacao: null });
  });

  it('aplica a gaveta e o grão escolhidos ao reativar, quando vierem', () => {
    expect(montarReativacaoItem({ grupo: 'outros', granularidade: 'cliente' }))
      .toEqual({ status: 'ativo', observacao: null, grupo: 'outros', granularidade: 'cliente' });
  });
});

describe('montarAtualizacaoItem', () => {
  it('devolve só o campo que mudou', () => {
    expect(montarAtualizacaoItem(linha(), { nota: 'Só o verso' }))
      .toEqual({ nota: 'Só o verso' });
  });

  it('não devolve nada quando a edição repete o que já está na linha', () => {
    expect(montarAtualizacaoItem(linha({ nota: 'Já era essa' }), { nota: 'Já era essa' }))
      .toEqual({});
  });

  it('volta a herdar quando o texto digitado é igual ao do catálogo', () => {
    const row = linha({ nota: 'Só o verso' });

    expect(montarAtualizacaoItem(row, { nota: 'Frente e verso' })).toEqual({ nota: null });
  });

  it('volta a herdar quando o analista apaga a sobrescrita', () => {
    const row = linha({ documento: 'RG (com foto)' });

    expect(montarAtualizacaoItem(row, { documento: '   ' })).toEqual({ documento: null });
  });

  it('no item manual, texto vazio é nulo — menos o documento, que é recusado', () => {
    const manual = linha({
      item_padrao_id: null,
      catalogo: null,
      documento: 'Contrato',
      entidade: 'Cliente',
    });

    expect(montarAtualizacaoItem(manual, { entidade: '  ' })).toEqual({ entidade: null });
    expect(() => montarAtualizacaoItem(manual, { documento: '' }))
      .toThrow(/nome do documento/);
  });

  it('aceita troca de gaveta e de grão, que são dados estruturais', () => {
    expect(montarAtualizacaoItem(linha(), {
      grupo: 'outros',
      granularidade: 'cliente',
    })).toEqual({ grupo: 'outros', granularidade: 'cliente' });
  });
});
