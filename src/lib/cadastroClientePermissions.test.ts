import { describe, expect, it } from 'vitest';

import {
  podeEditarCadastroCliente,
  podeExcluirCliente,
  podeVerAbasFinanceirasCliente,
  type CadastroClienteRoleFlags,
} from '@/lib/cadastroClientePermissions';

const papeis: Record<string, CadastroClienteRoleFlags> = {
  admin: { isAdmin: true, isLider: false, isSublider: false },
  lider: { isAdmin: false, isLider: true, isSublider: false },
  sublider: { isAdmin: false, isLider: false, isSublider: true },
  membro: { isAdmin: false, isLider: false, isSublider: false },
};

describe('alcadas do cadastro de cliente', () => {
  it.each(['admin', 'lider', 'sublider'])('%s pode editar e excluir o cadastro geral', (papel) => {
    expect(podeEditarCadastroCliente(papeis[papel])).toBe(true);
    expect(podeExcluirCliente(papeis[papel])).toBe(true);
  });

  it('membro de equipe nao pode editar nem excluir o cadastro geral', () => {
    expect(podeEditarCadastroCliente(papeis.membro)).toBe(false);
    expect(podeExcluirCliente(papeis.membro)).toBe(false);
  });

  it.each(['admin', 'lider'])('%s ve OS, Faturamento e Proposta', (papel) => {
    expect(podeVerAbasFinanceirasCliente(papeis[papel])).toBe(true);
  });

  it.each(['sublider', 'membro'])('%s nao ve OS, Faturamento nem Proposta', (papel) => {
    expect(podeVerAbasFinanceirasCliente(papeis[papel])).toBe(false);
  });
});
