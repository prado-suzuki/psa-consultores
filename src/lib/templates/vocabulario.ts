import { areaExtenso, cardinalExtenso, valorExtenso } from './extenso';
import { PARES, concordarTexto, type Genero } from './concordancia';

// Vocabulário de campos organizado POR ENTIDADE (pessoa/bem/matricula/cartorio).
// Cada placeholder é `binding.campo` (ex.: {{ proprietario.nome }}, {{ imovel.area }});
// o binding (papel) define o tipo de entidade — ver binding.ts. Aqui mora só o
// catálogo de campos de cada tipo e a derivação (extensos / concordância) usada
// tanto pelos mapeadores (dados do banco) quanto na edição manual da tela Gerar.

export type TipoCampo = 'texto' | 'textarea' | 'area' | 'valor' | 'inteiro';

export type TipoEntidade = 'pessoa' | 'bem' | 'matricula' | 'cartorio';

export interface CampoEntidade {
  /** Id do campo dentro da entidade (parte após o ponto no placeholder). */
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Se presente, é um campo DERIVADO de outro (não é entrada direta no form). */
  derivadoDe?: string;
  /** Recalcula o valor do campo a partir dos demais (extensos, concordância). */
  derivar?: (valores: Record<string, string>) => string;
}

export interface Entidade {
  tipo: TipoEntidade;
  label: string;
  campos: CampoEntidade[];
}

/** Lê um número de uma string em formato pt-BR ("396,4000 ha", "558.413,55") ou cru ("396.4"). */
function paraNumeroBR(bruto: string | undefined): number {
  const limpo = (bruto ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!limpo) return NaN;
  // Com vírgula: ponto é separador de milhar, vírgula é decimal.
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number(limpo);
}

function paraInteiro(bruto: string | undefined): number {
  const t = (bruto ?? '').trim();
  if (t === '') return NaN;
  return Number(t);
}

// --- Campos derivados reutilizáveis -----------------------------------------

const areaExtensoCampo: CampoEntidade = {
  id: 'areaExtenso',
  label: 'Área (por extenso)',
  tipo: 'texto',
  derivadoDe: 'area',
  derivar: (v) => {
    const n = paraNumeroBR(v.area);
    return Number.isFinite(n) ? areaExtenso(n) : '';
  },
};

const valorExtensoCampo: CampoEntidade = {
  id: 'valorExtenso',
  label: 'Valor (por extenso)',
  tipo: 'texto',
  derivadoDe: 'valor',
  derivar: (v) => {
    const n = paraNumeroBR(v.valor);
    return Number.isFinite(n) ? valorExtenso(n) : '';
  },
};

function cardinalCampo(id: string, label: string, derivadoDe: string): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe,
    derivar: (v) => {
      const n = paraInteiro(v[derivadoDe]);
      return Number.isFinite(n) ? cardinalExtenso(n) : '';
    },
  };
}

/** Campo de concordância derivado do gênero (ex.: brasileiro → brasileiro/brasileira). */
function concordanciaCampo(
  id: string,
  label: string,
  par: (g: Genero) => string,
): CampoEntidade {
  return {
    id,
    label,
    tipo: 'texto',
    derivadoDe: 'genero',
    derivar: (v) => par((v.genero || null) as Genero),
  };
}

// --- Catálogo de entidades ---------------------------------------------------

export const ENTIDADES: Record<TipoEntidade, Entidade> = {
  pessoa: {
    tipo: 'pessoa',
    label: 'Pessoa',
    campos: [
      { id: 'nome', label: 'Nome / Denominação', tipo: 'texto' },
      { id: 'cpfCnpj', label: 'CPF / CNPJ', tipo: 'texto' },
      { id: 'nacionalidade', label: 'Nacionalidade', tipo: 'texto' },
      { id: 'estadoCivil', label: 'Estado civil', tipo: 'texto' },
      { id: 'profissao', label: 'Profissão', tipo: 'texto' },
      { id: 'rg', label: 'Documento de identidade', tipo: 'texto' },
      { id: 'orgaoExpedidor', label: 'Órgão expedidor', tipo: 'texto' },
      { id: 'endereco', label: 'Endereço', tipo: 'texto' },
      { id: 'genero', label: 'Gênero (M/F)', tipo: 'texto' },
      // Concordância de gênero (campos derivados, sem nova sintaxe no template).
      concordanciaCampo('artigo', 'Artigo (o/a)', PARES.artigo),
      concordanciaCampo('brasileiro', 'Nacionalidade concordada (brasileiro/a)', PARES.brasileiro),
      concordanciaCampo('nascido', 'Nascido(a)', PARES.nascido),
      concordanciaCampo('portador', 'Portador(a)', PARES.portador),
      concordanciaCampo('residente', 'Residente e domiciliado(a)', PARES.residente),
      concordanciaCampo('inscrito', 'Inscrito(a)', PARES.inscrito),
      {
        id: 'casado',
        label: 'Estado civil concordado (casado/a)',
        tipo: 'texto',
        derivadoDe: 'estadoCivil',
        derivar: (v) => concordarTexto(v.estadoCivil, (v.genero || null) as Genero),
      },
    ],
  },
  bem: {
    tipo: 'bem',
    label: 'Bem',
    campos: [
      { id: 'denominacao', label: 'Denominação', tipo: 'texto' },
      { id: 'referencia', label: 'Referência (DP)', tipo: 'texto' },
      { id: 'tipo', label: 'Tipo do bem', tipo: 'texto' },
      { id: 'valor', label: 'Valor contábil (R$)', tipo: 'valor' },
      valorExtensoCampo,
      { id: 'ccir', label: 'Cadastro do imóvel rural (CCIR/SNCR)', tipo: 'texto' },
      { id: 'inscricaoMunicipal', label: 'Inscrição municipal', tipo: 'texto' },
    ],
  },
  matricula: {
    tipo: 'matricula',
    label: 'Imóvel / Matrícula',
    campos: [
      { id: 'numero', label: 'Nº da matrícula', tipo: 'texto' },
      { id: 'livro', label: 'Livro', tipo: 'texto' },
      cardinalCampo('livroExtenso', 'Livro (por extenso)', 'livro'),
      { id: 'folha', label: 'Folha / Ficha', tipo: 'texto' },
      cardinalCampo('folhaExtenso', 'Folha (por extenso)', 'folha'),
      { id: 'municipio', label: 'Município do imóvel', tipo: 'texto' },
      { id: 'uf', label: 'Estado (UF) do imóvel', tipo: 'texto' },
      { id: 'area', label: 'Área (hectares)', tipo: 'area' },
      areaExtensoCampo,
      { id: 'valor', label: 'Valor contábil (R$)', tipo: 'valor' },
      valorExtensoCampo,
      { id: 'denominacao', label: 'Denominação', tipo: 'texto' },
      { id: 'proprietario', label: 'Proprietário(s)', tipo: 'texto' },
      { id: 'cartorio', label: 'Cartório', tipo: 'texto' },
      { id: 'comarca', label: 'Comarca', tipo: 'texto' },
      { id: 'ufCartorio', label: 'Estado (UF) do cartório', tipo: 'texto' },
      { id: 'ccir', label: 'Cadastro do imóvel rural (CCIR/SNCR)', tipo: 'texto' },
      { id: 'confrontacoes', label: 'Limites e confrontações', tipo: 'textarea' },
    ],
  },
  cartorio: {
    tipo: 'cartorio',
    label: 'Cartório',
    campos: [
      { id: 'nome', label: 'Nome do cartório', tipo: 'texto' },
      { id: 'comarca', label: 'Comarca', tipo: 'texto' },
      { id: 'uf', label: 'Estado (UF)', tipo: 'texto' },
    ],
  },
};

export const TIPOS_ENTIDADE = Object.keys(ENTIDADES) as TipoEntidade[];

export function camposDaEntidade(tipo: TipoEntidade): CampoEntidade[] {
  return ENTIDADES[tipo].campos;
}

export function campoDaEntidade(tipo: TipoEntidade, id: string): CampoEntidade | undefined {
  return ENTIDADES[tipo].campos.find((c) => c.id === id);
}

/**
 * Recalcula os campos derivados (extensos, concordância) de uma entidade a partir
 * dos valores atuais. Usado pelos mapeadores (após preencher os campos-base com os
 * dados do banco) e na edição manual da tela Gerar.
 */
export function derivarCampos(
  tipo: TipoEntidade,
  valores: Record<string, string>,
): Record<string, string> {
  const out = { ...valores };
  for (const campo of ENTIDADES[tipo].campos) {
    if (campo.derivar) out[campo.id] = campo.derivar(out);
  }
  return out;
}
