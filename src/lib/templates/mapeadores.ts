import { formatarArea, formatarValor } from './extenso';
import { ufPorExtenso } from './concordancia';
import { derivarCampos } from './vocabulario';
import type { Binding } from './binding';
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
  set('profissao', row.profissao);
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
  set('numeroOficio', row.numero_oficio);
  return derivarCampos('cartorio', out);
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
 * binding (`{ proprietario: {...}, imovel: {...} }`) mais os placeholders soltos
 * (modelos legados) no topo. Bindings sem seleção entram como `{}` para não quebrar
 * a prévia (o render só falha em placeholder usado e não resolvido).
 */
export function montarContexto(
  bindings: Binding[],
  selecao: Record<string, Campos>,
  desconhecidos: Record<string, string> = {},
): Contexto {
  const ctx: Contexto = {};
  for (const b of bindings) ctx[b.nome] = selecao[b.nome] ?? {};
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
