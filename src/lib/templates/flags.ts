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
