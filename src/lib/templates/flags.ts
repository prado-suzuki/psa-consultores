// Avaliação de flags DERIVADAS declarativas: cada flag aponta um campo de uma
// entidade do contexto de geração (ex.: empresa.tipo_empresa = 'PR') e fica
// ativa quando o registro selecionado bate com o valor esperado. O engine não
// conhece o schema — só compara valores sobre as fontes que a tela fornecer;
// flags sobre novas entidades entram sem mudança aqui (só novas linhas no
// catálogo + a fonte no contexto).

export interface FlagDeclarativa {
  /** Identificador semântico ("empresa-proprietaria") — é o que tmpl_bloco_flag referencia. */
  nome: string;
  /** Chave da fonte no contexto de geração ("empresa", futuramente "cliente"…). */
  entidade: string;
  /** Coluna/campo do registro da fonte ("tipo_empresa"). */
  campo: string;
  /** Valor que ativa a flag ("PR"). */
  valor: string;
}

/** Registros selecionados na geração, por entidade (ex.: { empresa: PessoaRow }). */
export type FontesFlags = Record<string, Record<string, unknown> | null | undefined>;

/**
 * Nomes das flags ativas dadas as fontes. Comparação por igualdade de string
 * (valores de catálogo: 'PR', 'CN', 'SC'…); fonte ausente desativa a flag.
 */
export function avaliarFlags(definicoes: FlagDeclarativa[], fontes: FontesFlags): string[] {
  return definicoes
    .filter((f) => {
      const registro = fontes[f.entidade];
      if (!registro) return false;
      const atual = registro[f.campo];
      return atual !== null && atual !== undefined && String(atual) === f.valor;
    })
    .map((f) => f.nome);
}

/** Condição estrutural da peça compartilhada pelo modelo societário. */
export function flagDaPeca(numeroAlteracao: number): 'e_alteracao' | 'e_constituicao' {
  return numeroAlteracao >= 1 ? 'e_alteracao' : 'e_constituicao';
}

/**
 * Flags de um snapshot SELADO antes de uma flag de PAR existir, completadas com
 * o lado que aquelas peças sempre foram.
 *
 * Documento validado e não registrado renderiza a estrutura do modelo VIVO com
 * as flags CONGELADAS, então uma flag nova exigida por um bloco antigo faz o
 * bloco sumir de todo o acervo validado, sem sinal nenhum. Aqui se completa o
 * que o snapshot não tinha como dizer.
 *
 * `e_constituicao` / `e_alteracao` nasceram em 26/08/2026. Todo snapshot
 * anterior a elas é de contrato social (a alteração contratual como documento
 * próprio não existia), mas não diz isso, e os blocos que passaram a pender de
 * `e_constituicao` saíam daquelas peças: a cláusula de capital, a sede, o
 * objeto.
 *
 * `governanca_por_orgaos` / `administracao_simples` nasceram na frente de
 * governança. Toda peça selada antes dela é de administração simples, e sem
 * completar o par o capítulo inteiro da Administração sumiria dos validados,
 * que é o mesmo defeito uma frente depois.
 *
 * Cada par só se completa quando falta INTEIRO: snapshot que já traz um dos
 * dois lados é decisão selada e não se mexe.
 */
export function comFlagDaPecaRetroativa(snapshotFlags: readonly string[]): string[] {
  const completas = [...snapshotFlags];
  for (const [umLado, outroLado, ausente] of PARES_RETROATIVOS) {
    if (!completas.includes(umLado) && !completas.includes(outroLado)) completas.push(ausente);
  }
  return completas;
}

/** Os pares mutuamente exclusivos, e o lado que o acervo antigo recebe. */
const PARES_RETROATIVOS = [
  ['e_constituicao', 'e_alteracao', 'e_constituicao'],
  ['governanca_por_orgaos', 'administracao_simples', 'administracao_simples'],
] as const;
