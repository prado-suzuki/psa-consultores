import { labelDoBinding, resolverTipoDoBinding } from './binding';
import { campoDaEntidade, campoManual, type CampoEntidade, type TipoCampo, type TipoEntidade } from './vocabulario';
import type { MarcacaoCampo } from './render';

// A ponte entre um CAMINHO de placeholder ("imovel.numero", "dataAssinatura") e
// o que o vocabulário sabe sobre ele. Mora fora do render de propósito: o render
// é agnóstico de domínio (não sabe o que é "sócio") e recebe esta classificação
// injetada — é também o que evita o ciclo render → binding → render.

export interface CampoDoCaminho {
  /** O caminho como aparece no bloco. */
  caminho: string;
  /** Rótulo legível, com o papel na frente ("Imóvel — Nº da matrícula"). */
  label: string;
  tipo: TipoCampo;
  /** Preenchido na tela Gerar, sem cadastro por trás. */
  manual: boolean;
  /** Sem ele resolvido, o documento que o usa está incompleto. */
  obrigatorio: boolean;
}

/**
 * Lacuna assinalável de cada tipo de campo: o que sai no lugar de um campo
 * MANUAL não preenchido. O formato vem do TIPO, decidido aqui para todos de uma
 * vez — não é o bloco que escreve o traço, senão cada autor inventaria o seu.
 */
const LACUNA_POR_TIPO: Partial<Record<TipoCampo, string>> = {
  data: '____ de ______________ de 20__',
  valor: 'R$ __________',
  inteiro: '______',
};

/** Lacuna do tipo; texto/textarea (e o que não tiver forma própria) usam o traço simples. */
export function lacunaDoTipo(tipo: TipoCampo): string {
  return LACUNA_POR_TIPO[tipo] ?? '____________________';
}

/** O campo do vocabulário por trás de um caminho, com o rótulo do papel. */
export function classificarCaminho(caminho: string): CampoDoCaminho | undefined {
  const ponto = caminho.indexOf('.');
  if (ponto < 0) return doCampo(caminho, campoManual(caminho), null);

  const papel = caminho.slice(0, ponto);
  const tipo = resolverTipoDoBinding(papel);
  if (!tipo) return undefined;
  return doCampo(caminho, campoDaEntidade(tipo, caminho.slice(ponto + 1)), papel, tipo);
}

/**
 * Campo DERIVADO de um manual herda o `manual` da base.
 *
 * `instrumento.foroUfExtenso` deriva de `foroUf`, que o consultor digita na tela
 * Gerar. Sem herdar, o derivado resolvia '' e a cláusula saía "Estado de ," — com
 * a vírgula pendurada. Herdando, ele vira a mesma lacuna assinalável da base, e a
 * frase fica legível para quem vai preencher à mão.
 *
 * Só o `manual` sobe. `obrigatorio` NÃO: o que torna o documento incompleto é a
 * base faltar, e contar as duas faria a tela Gerar acusar a mesma pendência duas
 * vezes com nomes diferentes.
 */
function herdaManualDaBase(tipo: TipoEntidade | null, campo: CampoEntidade): boolean {
  if (campo.manual) return true;
  if (!tipo || !campo.derivadoDe) return false;
  const bases = Array.isArray(campo.derivadoDe) ? campo.derivadoDe : [campo.derivadoDe];
  return bases.some((baseId) => campoDaEntidade(tipo, baseId)?.manual);
}

function doCampo(
  caminho: string,
  campo: CampoEntidade | undefined,
  papel: string | null,
  tipo: TipoEntidade | null = null,
): CampoDoCaminho | undefined {
  if (!campo) return undefined;
  return {
    caminho,
    label: papel ? `${labelDoBinding(papel)} — ${campo.label}` : campo.label,
    tipo: campo.tipo,
    manual: herdaManualDaBase(tipo, campo),
    obrigatorio: !!campo.obrigatorio,
  };
}

/**
 * O que o render precisa saber de um caminho que resolveu VAZIO: com que lacuna
 * substituí-lo (campo manual) e se a ausência deixa o documento incompleto
 * (campo obrigatório). É esta função que `gerarBlocos` injeta no render.
 */
export function marcacaoDoCaminho(caminho: string): MarcacaoCampo | undefined {
  const campo = classificarCaminho(caminho);
  if (!campo) return undefined;
  const marcacao: MarcacaoCampo = {};
  if (campo.manual) marcacao.lacuna = lacunaDoTipo(campo.tipo);
  if (campo.obrigatorio) marcacao.obrigatorio = true;
  return marcacao.lacuna || marcacao.obrigatorio ? marcacao : undefined;
}
