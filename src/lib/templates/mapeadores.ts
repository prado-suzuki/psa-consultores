import { cardinalExtenso, formatarArea, formatarInteiro, formatarValor, valorExtenso } from './extenso';
import { ufPorExtenso } from './concordancia';
import { derivarCampos } from './vocabulario';
import type { Binding, BindingLista } from './binding';
import type { Contexto } from './types';
import type { TipoEntidade } from './vocabulario';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { BemRow, CartorioRow } from '@/hooks/useDiagnosticoPatrimonial';

// Mapeadores puros (sem React): convertem uma linha do cadastro nos campos do
// vocabulário da entidade correspondente, já com os derivados (extensos via
// extenso.ts e concordância via concordancia.ts, ambos aplicados por derivarCampos).

type Campos = Record<string, string>;

/** Acumula só valores presentes — campo ausente deixa o placeholder "não resolvido" (falha cedo). */
function coletor() {
  const out: Campos = {};
  const set = (chave: string, valor: unknown) => {
    if (valor !== null && valor !== undefined && valor !== '') out[chave] = String(valor);
  };
  return { out, set };
}

const TIPO_BEM_LABEL: Record<string, string> = {
  IR: 'Imóvel Rural', IB: 'Imóvel Urbano', AP: 'Arrendamento e/ou Parceria',
  PS: 'Participação Societária', OU: 'Outros',
};

export function mapearPessoa(row: PessoaRow): Campos {
  const { out, set } = coletor();
  set('nome', row.denominacao);
  set('cpfCnpj', row.cpf_cnpj);
  set('nacionalidade', row.nacionalidade);
  set('estadoCivil', row.estado_civil);
  // Profissão é opcional: espólios e PJs (sócias) não têm — resolve em branco
  // em vez de travar a geração; {{#profissao}}…{{/profissao}} segue condicional.
  out.profissao = row.profissao ?? '';
  set('rg', row.documento_identidade_numero);
  set('orgaoExpedidor', [row.documento_identidade_orgao, row.documento_identidade_uf].filter(Boolean).join('/'));
  set('genero', row.genero);

  const endereco = [
    [row.endereco_logradouro, row.endereco_numero].filter(Boolean).join(', '),
    row.endereco_complemento,
    row.endereco_bairro,
    [row.endereco_municipio, row.endereco_uf].filter(Boolean).join('/'),
    row.endereco_cep ? `CEP ${row.endereco_cep}` : '',
  ].filter(Boolean).join(', ');
  set('endereco', endereco);

  return derivarCampos('pessoa', out);
}

export function mapearBem(row: BemRow): Campos {
  const { out, set } = coletor();
  set('denominacao', row.denominacao);
  set('referencia', row.referencia_dp);
  set('tipo', row.tipo_bem ? (TIPO_BEM_LABEL[row.tipo_bem] ?? row.tipo_bem) : '');
  if (row.vlr_contabil != null) set('valor', formatarValor(row.vlr_contabil));
  set('ccir', row.ccir_codigo);
  set('inscricaoMunicipal', row.inscricao_municipal);
  return derivarCampos('bem', out);
}

// Linha de matrícula enriquecida com bem + cartório + titulares (achatados sob o
// binding do imóvel), no formato que `useRegistrosPorTipo` monta a partir do JOIN.
export interface MatriculaParaMapear {
  numero: string | null;
  livro: string | null;
  folha: string | null;
  municipio_imovel: string | null;
  uf_imovel: string | null;
  area_documento: number | null;
  area_unidade: string | null;
  vlr_contabil: number | null;
  confrontacoes_texto: string | null;
  descricao_psa_completa: string | null;
  bem: { denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titulares: Array<{ denominacao: string | null }>;
}

export function mapearMatricula(m: MatriculaParaMapear): Campos {
  const { out, set } = coletor();

  // Área: o gerador trabalha em hectares; converte se a matrícula estiver em m².
  let areaHa = m.area_documento ?? null;
  if (areaHa != null && m.area_unidade === 'm2') areaHa = areaHa / 10000;
  if (areaHa != null) set('area', formatarArea(areaHa));

  const proprietarios = m.titulares.map((t) => t.denominacao).filter(Boolean);
  const valor = m.vlr_contabil ?? m.bem?.vlr_contabil ?? null;

  set('numero', m.numero);
  set('livro', m.livro);
  set('folha', m.folha);
  set('municipio', m.municipio_imovel);
  set('uf', ufPorExtenso(m.uf_imovel));
  if (valor != null) set('valor', formatarValor(valor));
  set('denominacao', m.bem?.denominacao);
  set('proprietario', proprietarios.join(' e '));
  set('cartorio', m.cartorio?.nome_completo);
  set('comarca', m.cartorio?.comarca);
  set('ufCartorio', ufPorExtenso(m.cartorio?.uf));
  set('ccir', m.bem?.ccir_codigo);
  set('confrontacoes', m.confrontacoes_texto ?? m.descricao_psa_completa);

  return derivarCampos('matricula', out);
}

export function mapearCartorio(row: CartorioRow): Campos {
  const { out, set } = coletor();
  set('nome', row.nome_completo);
  set('comarca', row.comarca);
  set('uf', ufPorExtenso(row.uf));
  return derivarCampos('cartorio', out);
}

// --- Itens de lista (seções {{#socios}} / {{#administradores}}) ---------------

/**
 * Item de uma lista no contexto do render: a chave singular do papel carrega os
 * campos ({ socio: {...} }) e as condicionais sePF/sePJ ficam no topo do escopo
 * do item, onde as seções {{#sePF}}/{{#sePJ}} as resolvem.
 */
export interface ItemLista {
  [chave: string]: Campos | boolean;
}

/** Linha do quadro societário com a pessoa do sócio juntada (e o representante, se sócia PJ). */
export interface SocioParaMapear {
  pessoa: PessoaRow;
  quotas: number | null;
  vlr_total: number | null;
  /** Nome(s) do(s) administrador(es) da sócia PJ ("neste ato representada por…"). */
  representante: string | null;
}

export function mapearSocio(s: SocioParaMapear): ItemLista {
  const campos = mapearPessoa(s.pessoa);
  if (s.quotas != null) {
    campos.quotas = formatarInteiro(s.quotas);
    campos.quotasExtenso = cardinalExtenso(s.quotas);
  }
  if (s.vlr_total != null) {
    campos.vlrTotal = formatarValor(s.vlr_total);
    campos.vlrTotalExtenso = valorExtenso(s.vlr_total);
  }
  if (s.representante) campos.representante = s.representante;
  return { socio: campos, sePF: s.pessoa.tipo_pessoa === 'PF', sePJ: s.pessoa.tipo_pessoa === 'PJ' };
}

/** Linha de administração com a pessoa do administrador juntada. */
export interface AdministradorParaMapear {
  pessoa: PessoaRow;
  cargo: string | null;
}

export function mapearAdministrador(a: AdministradorParaMapear): ItemLista {
  const campos = mapearPessoa(a.pessoa);
  if (a.cargo) campos.cargo = a.cargo;
  return {
    administrador: campos,
    sePF: a.pessoa.tipo_pessoa === 'PF',
    sePJ: a.pessoa.tipo_pessoa === 'PJ',
  };
}

/** Despacha para o mapeador do tipo de entidade do binding. */
export function mapearRegistro(tipo: TipoEntidade, row: unknown): Campos {
  switch (tipo) {
    case 'pessoa':
      return mapearPessoa(row as PessoaRow);
    case 'bem':
      return mapearBem(row as BemRow);
    case 'matricula':
      return mapearMatricula(row as MatriculaParaMapear);
    case 'cartorio':
      return mapearCartorio(row as CartorioRow);
  }
}

/**
 * Monta o contexto aninhado consumido pelo render pontilhado: um sub-objeto por
 * binding (`{ proprietario: {...}, imovel: {...} }`), um array de itens por lista
 * (`{ socios: [...] }`) mais os placeholders soltos (modelos legados) no topo.
 * Bindings sem seleção entram como `{}` e listas sem itens como `[]` para não
 * quebrar a prévia (o render só falha em placeholder usado e não resolvido).
 */
export function montarContexto(
  bindings: Binding[],
  selecao: Record<string, Campos>,
  desconhecidos: Record<string, string> = {},
  listas: Record<string, ItemLista[]> = {},
  bindingsLista: BindingLista[] = [],
): Contexto {
  const ctx: Contexto = {};
  for (const b of bindings) ctx[b.nome] = selecao[b.nome] ?? {};
  for (const bl of bindingsLista) ctx[bl.nome] = listas[bl.nome] ?? [];
  // Desconhecidos podem ter ponto (papel não mapeado): aninha o caminho para
  // casar com a resolução pontilhada do render (ctx.foo.bar), não a chave literal.
  for (const [ph, valor] of Object.entries(desconhecidos)) {
    const partes = ph.split('.');
    let cursor = ctx as Record<string, unknown>;
    for (let i = 0; i < partes.length - 1; i++) {
      const chave = partes[i];
      if (typeof cursor[chave] !== 'object' || cursor[chave] === null) cursor[chave] = {};
      cursor = cursor[chave] as Record<string, unknown>;
    }
    cursor[partes[partes.length - 1]] = valor;
  }
  return ctx;
}
