import { areaExtenso, cardinalExtenso, formatarArea, formatarValor, valorExtenso } from './extenso';

// Vocabulário de campos: o catálogo (mantido no código, decisão da arquitetura OSG)
// que diz, para cada campo de ENTRADA preenchido pelo usuário, quais placeholders
// ele produz no contexto — incluindo os derivados (por extenso, formatação).
//
// Ex.: a entrada "Área (ha)" é um número; produz {{area}} (formatado) e
// {{areaExtenso}} (decomposição cartorial). O usuário digita um só valor.

export type TipoCampo = 'texto' | 'textarea' | 'area' | 'valor' | 'inteiro';

export interface CampoVocabulario {
  /** Chave do campo de entrada (não é, necessariamente, um placeholder). */
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Placeholders que este campo preenche. */
  placeholders: string[];
  /** Produz os valores dos placeholders a partir do valor bruto digitado. Retorna {} se inválido. */
  produzir(bruto: string): Record<string, string>;
}

function paraNumero(bruto: string): number {
  return Number(bruto.trim().replace(',', '.'));
}

/** Campo de texto simples que preenche um único placeholder homônimo. */
function texto(id: string, label: string, tipo: 'texto' | 'textarea' = 'texto'): CampoVocabulario {
  return { id, label, tipo, placeholders: [id], produzir: (b) => ({ [id]: b }) };
}

export const VOCABULARIO: CampoVocabulario[] = [
  {
    id: 'areaHa',
    label: 'Área (hectares)',
    tipo: 'area',
    placeholders: ['area', 'areaExtenso'],
    produzir: (b) => {
      const n = paraNumero(b);
      if (!Number.isFinite(n)) return {};
      return { area: formatarArea(n), areaExtenso: areaExtenso(n) };
    },
  },
  {
    id: 'valorContabil',
    label: 'Valor contábil (R$)',
    tipo: 'valor',
    placeholders: ['valor', 'valorExtenso'],
    produzir: (b) => {
      const n = paraNumero(b);
      if (!Number.isFinite(n)) return {};
      return { valor: formatarValor(n), valorExtenso: valorExtenso(n) };
    },
  },
  {
    id: 'livro',
    label: 'Livro',
    tipo: 'texto',
    placeholders: ['livro', 'livroExtenso'],
    produzir: (b) => {
      const n = Number(b);
      return Number.isFinite(n) ? { livro: b, livroExtenso: cardinalExtenso(n) } : { livro: b };
    },
  },
  {
    id: 'folha',
    label: 'Folha/Ficha',
    tipo: 'texto',
    placeholders: ['folha', 'folhaExtenso'],
    produzir: (b) => {
      const n = Number(b);
      return Number.isFinite(n) ? { folha: b, folhaExtenso: cardinalExtenso(n) } : { folha: b };
    },
  },
  texto('denominacao', 'Denominação'),
  texto('proprietario', 'Proprietário'),
  texto('municipio', 'Município do imóvel'),
  texto('uf', 'Estado (UF) do imóvel'),
  texto('matricula', 'Nº da matrícula'),
  texto('cartorio', 'Cartório'),
  texto('comarca', 'Comarca'),
  texto('ufCartorio', 'Estado (UF) do cartório'),
  texto('ccir', 'Cadastro do imóvel rural (CCIR/SNCR)'),
  texto('confrontacoes', 'Limites e confrontações', 'textarea'),
];

const PLACEHOLDER_INDEX = new Map<string, CampoVocabulario>();
for (const campo of VOCABULARIO) {
  for (const ph of campo.placeholders) PLACEHOLDER_INDEX.set(ph, campo);
}

export interface PlaceholderSugerido {
  /** Nome do placeholder (o que vai dentro de {{ }}). */
  placeholder: string;
  /** Rótulo legível do campo de entrada que o produz. */
  label: string;
  tipo: TipoCampo;
}

/**
 * Catálogo achatado de placeholders disponíveis — alimenta o autocomplete do
 * editor de modelos. Inclui os derivados (por extenso) com rótulo distinto.
 */
export function listarPlaceholders(): PlaceholderSugerido[] {
  const out: PlaceholderSugerido[] = [];
  for (const campo of VOCABULARIO) {
    for (const ph of campo.placeholders) {
      const ehExtenso = ph !== campo.id && ph.toLowerCase().endsWith('extenso');
      out.push({
        placeholder: ph,
        label: ehExtenso ? `${campo.label} — por extenso` : campo.label,
        tipo: campo.tipo,
      });
    }
  }
  return out;
}

export function campoDoPlaceholder(placeholder: string): CampoVocabulario | undefined {
  return PLACEHOLDER_INDEX.get(placeholder);
}

/**
 * Dado os placeholders usados num documento, retorna os campos de entrada
 * distintos necessários e os placeholders sem campo no vocabulário (desconhecidos).
 */
export function camposNecessarios(placeholders: string[]): {
  campos: CampoVocabulario[];
  desconhecidos: string[];
} {
  const campos = new Map<string, CampoVocabulario>();
  const desconhecidos: string[] = [];
  for (const ph of placeholders) {
    const campo = campoDoPlaceholder(ph);
    if (campo) campos.set(campo.id, campo);
    else if (!desconhecidos.includes(ph)) desconhecidos.push(ph);
  }
  return { campos: [...campos.values()], desconhecidos };
}

/**
 * Monta o contexto de placeholders a partir dos valores brutos digitados.
 * Chaves de `valores` são ids de campo do vocabulário; `desconhecidos` são
 * placeholders preenchidos como texto livre (chave = nome do placeholder).
 */
export function montarContextoDeEntradas(
  valores: Record<string, string>,
  desconhecidos: string[] = [],
): Record<string, string> {
  const contexto: Record<string, string> = {};
  for (const campo of VOCABULARIO) {
    const bruto = valores[campo.id];
    if (bruto !== undefined && bruto !== '') Object.assign(contexto, campo.produzir(bruto));
  }
  for (const ph of desconhecidos) {
    if (valores[ph] !== undefined) contexto[ph] = valores[ph];
  }
  return contexto;
}
