export interface CadastroClienteRoleFlags {
  isAdmin: boolean;
  isLider: boolean;
  isSublider: boolean;
}

/** Cadastro geral: criar, editar e excluir exige sublider ou acima. */
export function podeEditarCadastroCliente(papel: CadastroClienteRoleFlags): boolean {
  return papel.isAdmin || papel.isLider || papel.isSublider;
}

/** A exclusao segue a mesma alcada do restante do cadastro geral. */
export function podeExcluirCliente(papel: CadastroClienteRoleFlags): boolean {
  return podeEditarCadastroCliente(papel);
}

/** OS, Faturamento e Proposta sao informacoes financeiras: apenas lider ou admin. */
export function podeVerAbasFinanceirasCliente(
  papel: Pick<CadastroClienteRoleFlags, 'isAdmin' | 'isLider'>,
): boolean {
  return papel.isAdmin || papel.isLider;
}
