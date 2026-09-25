import { describe, expect, it } from 'vitest';
import {
  agruparPorGrupo,
  contarPorProduto,
  dataComHora,
  dataCurta,
  encontrarItemDoCatalogo,
  estadoDaSolicitacao,
  filtrarPorProduto,
  FILTRO_TODOS,
  geracaoTemOQueTrazer,
  graoSugeridoParaGrupo,
  GRAOS_DE_BENS_IMOVEIS,
  montarAtualizacaoItem,
  montarReativacaoItem,
  montarItemDeCatalogo,
  montarItemManual,
  montarTipoAvulso,
  MODULO_AVULSO,
  ordenarItens,
  paraGranularidade,
  removerPedeConfirmacao,
  resumoPorGrupo,
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
  modelo_bucket: null,
  modelo_path: null,
  modelo_nome: null,
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

describe('graoSugeridoParaGrupo', () => {
  it('determina o grão nas três gavetas em que ele é consequência da gaveta', () => {
    expect(graoSugeridoParaGrupo('pf')).toBe('pessoa_pf');
    expect(graoSugeridoParaGrupo('pj')).toBe('pessoa_pj');
    expect(graoSugeridoParaGrupo('outros')).toBe('cliente');
  });

  it('devolve null em Bens e Imóveis, onde o grão não é dedutível', () => {
    // Rural e urbana convivem na mesma gaveta. Escolher uma por padrão gravaria
    // um grão que o analista não escolheu — por isso a tela pergunta.
    expect(graoSugeridoParaGrupo('bens_imoveis')).toBeNull();
    expect(GRAOS_DE_BENS_IMOVEIS).toEqual(['matricula_rural', 'matricula_urbana']);
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

describe('recorte por produto', () => {
  // O RG é pedido por dois produtos da OS; a matrícula, por um; e há um item
  // criado à mão, que não pertence a produto nenhum.
  const rg = resolverItem(linha({ id: 'rg', item_padrao_id: 'cat-rg', catalogo: catalogo({ id: 'cat-rg' }) }));
  const matricula = resolverItem(linha({
    id: 'mat',
    item_padrao_id: 'cat-mat',
    grupo: 'bens_imoveis',
    granularidade: 'matricula_rural',
    catalogo: catalogo({ id: 'cat-mat', grupo: 'bens_imoveis' }),
  }));
  const manual = resolverItem(linha({
    id: 'man', item_padrao_id: null, catalogo: null, documento: 'Contrato', grupo: 'outros', granularidade: 'cliente',
  }));

  const itens = [rg, matricula, manual];
  const produtosPorDocumento = new Map([
    ['cat-rg', ['ES', 'DSSG']],
    ['cat-mat', ['ES']],
  ]);

  it('sem filtro, devolve a lista inteira', () => {
    expect(filtrarPorProduto(itens, FILTRO_TODOS, produtosPorDocumento)).toHaveLength(3);
  });

  it('filtra pelos documentos que o produto pede', () => {
    expect(filtrarPorProduto(itens, 'ES', produtosPorDocumento).map((i) => i.id))
      .toEqual(['rg', 'mat']);
    expect(filtrarPorProduto(itens, 'DSSG', produtosPorDocumento).map((i) => i.id))
      .toEqual(['rg']);
  });

  it('o item criado à mão não é alcançado por filtro de produto nenhum', () => {
    // Ele aparece só na lista consolidada: não pertence a produto, então nenhum
    // recorte por produto o traz.
    expect(filtrarPorProduto(itens, 'ES', produtosPorDocumento).map((i) => i.id))
      .not.toContain('man');
    expect(filtrarPorProduto(itens, 'DSSG', produtosPorDocumento).map((i) => i.id))
      .not.toContain('man');
  });

  it('conta o mesmo documento em cada produto que o pede — a soma passa do total', () => {
    const contagem = contarPorProduto(itens, produtosPorDocumento);

    expect(contagem.get('ES')).toBe(2);
    expect(contagem.get('DSSG')).toBe(1);
    // 2 + 1 = 3 contra 2 documentos de catálogo na lista: é o mesmo RG contado
    // duas vezes, e é isso que a tela precisa explicar ao analista.
    expect(itens.filter((item) => item.doCatalogo)).toHaveLength(2);
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

const BASE_AVULSO = {
  documento: 'Escritura da Fazenda São João',
  granularidade: 'matricula_rural',
  grupo: 'bens_imoveis',
} as const;

describe('montarTipoAvulso', () => {
  // O item pedido à mão não tem linha no catálogo, e sem ela nenhum arquivo
  // consegue apontar para ele (documento_arquivo.documento_tipo_id é FK).
  it('monta a linha de catálogo avulsa do item manual', () => {
    expect(montarTipoAvulso('item-9', 'cli-1', {
      documento: '  Escritura da Fazenda São João  ',
      granularidade: 'matricula_rural',
      grupo: 'bens_imoveis',
      entidade: ' Matrícula ',
      nota: ' conferir com o cartório ',
      ordem: 7,
    })).toEqual({
      codigo: 'avulso-item-9',
      cliente_id: 'cli-1',
      solicitacao_item_id: 'item-9',
      modulo: MODULO_AVULSO,
      entidade: 'Matrícula',
      documento: 'Escritura da Fazenda São João',
      nota: 'conferir com o cartório',
      granularidade: 'matricula_rural',
      grupo: 'bens_imoveis',
      ordem: 7,
      obrigatorio_default: false,
      confidencial: false,
      ativo: true,
    });
  });

  // O código é único global (o seed do catálogo depende de ON CONFLICT (codigo)),
  // e derivar do id do item garante isso sem mexer no índice.
  it('deriva o código do id do item', () => {
    const a = montarTipoAvulso('item-a', 'cli-1', BASE_AVULSO);
    const b = montarTipoAvulso('item-b', 'cli-1', BASE_AVULSO);
    expect(a.codigo).not.toBe(b.codigo);
    expect(a.codigo).toBe('avulso-item-a');
  });

  // `entidade` é NOT NULL no catálogo e opcional no item manual.
  it('entidade ausente vira string vazia, não nulo', () => {
    expect(montarTipoAvulso('item-9', 'cli-1', BASE_AVULSO).entidade).toBe('');
  });

  // Obrigatório-por-padrão é o que se multiplica por instância em TODO cliente;
  // avulso é de um cliente só e nunca pode entrar nessa conta.
  it('nunca nasce obrigatório por padrão', () => {
    expect(montarTipoAvulso('item-9', 'cli-1', BASE_AVULSO).obrigatorio_default).toBe(false);
  });

  it('recusa documento vazio, como o item manual', () => {
    expect(() => montarTipoAvulso('item-9', 'cli-1', { ...BASE_AVULSO, documento: '  ' }))
      .toThrow(/nome do documento/);
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

describe('geracaoTemOQueTrazer', () => {
  // A resposta decide se o botão de gerar fica no corpo da tela vazia ou no topo.
  // Mora em `lib` porque as DUAS pontas perguntam — a página e o estado vazio — e
  // duas cópias divergiriam no primeiro ajuste, deixando a tela sem botão nenhum.
  it('só é não quando a OS é única e não tem documento vinculado', () => {
    expect(geracaoTemOQueTrazer(0, 1)).toBe(false);
  });

  it('com documento vinculado, tem o que trazer', () => {
    expect(geracaoTemOQueTrazer(1, 1)).toBe(true);
    expect(geracaoTemOQueTrazer(58, 1)).toBe(true);
  });

  it('com mais de uma OS, zero é "ainda não escolheu", não "não tem"', () => {
    // O total depende de qual OS o consultor escolher. Dizer que não há o que
    // trazer seria mentira — e era esse o caso que a condição antiga confundia.
    expect(geracaoTemOQueTrazer(0, 2)).toBe(true);
    expect(geracaoTemOQueTrazer(0, 7)).toBe(true);
  });

  it('não é ela que guarda o caso de nenhuma OS', () => {
    // Sem OS nenhuma a pergunta não chega aqui: quem filtra é a página, no
    // `ordensServico.length > 0`. Registrado para ninguém ler o `true` como
    // permissão de gerar sem OS.
    expect(geracaoTemOQueTrazer(0, 0)).toBe(true);
  });
});

describe('removerPedeConfirmacao', () => {
  it('pede quando o cliente já vê a lista no portal', () => {
    expect(removerPedeConfirmacao('enviada')).toBe(true);
    expect(removerPedeConfirmacao('em_checklist')).toBe(true);
  });

  it('não pede em rascunho, que o cliente ainda não vê', () => {
    expect(removerPedeConfirmacao('rascunho')).toBe(false);
  });

  it('não pede em encerrada nem sem solicitação, onde não há o que remover', () => {
    expect(removerPedeConfirmacao('encerrada')).toBe(false);
    expect(removerPedeConfirmacao(null)).toBe(false);
  });
});

describe('estadoDaSolicitacao', () => {
  // A data é construída no horário local e volta por ISO: o formato depende do
  // fuso da máquina, e o round-trip local mantém o dia em qualquer um deles.
  const enviadaEm = new Date(2026, 8, 10, 12).toISOString();
  const semData = null;

  it('cruza os três estados que o enum já diz', () => {
    expect(estadoDaSolicitacao({ status: 'rascunho', enviadaEm: semData })).toBe('rascunho');
    expect(estadoDaSolicitacao({ status: 'enviada', enviadaEm })).toBe('enviada');
    expect(estadoDaSolicitacao({ status: 'em_checklist', enviadaEm })).toBe('em_checklist');
  });

  it('encerrada com envio é finalizada', () => {
    expect(estadoDaSolicitacao({ status: 'encerrada', enviadaEm })).toBe('finalizada');
  });

  it('encerrada que nunca foi enviada é cancelada — nunca finalizada', () => {
    expect(estadoDaSolicitacao({ status: 'encerrada', enviadaEm: semData })).toBe('cancelada');
  });

  it('sem solicitação não há estado', () => {
    expect(estadoDaSolicitacao(null)).toBeNull();
  });
});

describe('resumoPorGrupo', () => {
  const item = (grupo: string, documento: string) => ({ grupo, documento }) as never;

  it('quebra pelas gavetas na ordem fixa dos grupos e sem gaveta vazia', () => {
    const resumo = resumoPorGrupo([
      item('bens_imoveis', 'Matrícula do imóvel'),
      item('pf', 'RG do sócio'),
      item('pf', 'CPF do sócio'),
    ]);

    expect(resumo.map((g) => g.grupo)).toEqual(['pf', 'bens_imoveis']);
    expect(resumo[0]).toMatchObject({
      titulo: 'Pessoas Físicas',
      contagem: 2,
      documentos: ['RG do sócio', 'CPF do sócio'],
    });
    expect(resumo[1]).toMatchObject({
      titulo: 'Bens e Imóveis',
      contagem: 1,
      documentos: ['Matrícula do imóvel'],
    });
  });

  it('lista vazia, resumo vazio', () => {
    expect(resumoPorGrupo([])).toEqual([]);
  });
});

describe('dataCurta e dataComHora', () => {
  // Mesmo round-trip local de estadoDaSolicitacao: constrói local, formata local.
  const iso = new Date(2026, 8, 24, 14, 35).toISOString();

  it('dataCurta sem data devolve vazio, e com data devolve DD/MM/AAAA', () => {
    expect(dataCurta(null)).toBe('');
    expect(dataCurta(iso)).toBe('24/09/2026');
  });

  it('dataComHora junta a data e o HHhMM', () => {
    expect(dataComHora(iso)).toBe('24/09/2026 às 14h35');
    expect(dataComHora(null)).toBe('');
  });
});
