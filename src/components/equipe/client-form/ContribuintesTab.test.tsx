// B20 · a metade compensatória da migração no módulo fiscal.
//
// A migração 20260813103000 tira o `initcap()` de três campos, e dois deles são
// do contribuinte: razão social e nome fantasia. Se a arrumação na escrita
// ficasse só no nome do cliente, metade do alcance da migração ficaria sem o
// "arrumar com o usuário vendo" que o B20 pede.
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import ContribuintesTab from '@/components/equipe/client-form/ContribuintesTab';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { DraftEntity, InscricaoIE } from '@/types/clientForm';

const contribuinte = (over: Partial<DraftEntity> = {}): DraftEntity =>
  ({
    _id: 1,
    tipo_pessoa: 'PJ',
    cpf_cnpj: '',
    nome_razao_social: '',
    nome_fantasia: '',
    ...over,
  }) as DraftEntity;

function montar() {
  const estado = { atual: [contribuinte()] as DraftEntity[] };

  function Anfitriao() {
    const [entities, setEntities] = useState<DraftEntity[]>(estado.atual);
    const [inscricoesMap, setInscricoesMap] = useState<Record<string, InscricaoIE[]>>({});
    estado.atual = entities;
    return (
      <ContribuintesTab
        entities={entities}
        setEntities={setEntities}
        inscricoesMap={inscricoesMap}
        setInscricoesMap={setInscricoesMap}
        cnpjLoading={false}
        cepLoading={false}
        cnpjLookup={async () => {}}
        cepLookup={async () => {}}
        isReadOnly={false}
        escopoEdicao="cliente"
        cadastroNovo
      />
    );
  }

  render(<TooltipProvider><Anfitriao /></TooltipProvider>);
  return estado;
}

const razaoSocial = () => screen.getByPlaceholderText('Nome Empresarial');

describe('razão social e nome fantasia guardam a caixa digitada', () => {
  it.each([
    'AGRO MMS S/A',
    'J.E. Participações LTDA',
    'COMERCIAL XPTO EIRELI ME',
  ])('%s sobrevive ao blur', async (nome) => {
    const user = userEvent.setup();
    const estado = montar();

    await user.click(razaoSocial());
    await user.paste(nome);
    await user.tab();

    expect(estado.atual[0].nome_razao_social).toBe(nome);
    expect(razaoSocial()).toHaveValue(nome);
  });

  it('o blur arruma espaço, e só espaço', async () => {
    const user = userEvent.setup();
    const estado = montar();

    await user.click(razaoSocial());
    await user.paste('  AGRO   MMS  S/A ');
    expect(estado.atual[0].nome_razao_social).toBe('  AGRO   MMS  S/A ');

    await user.tab();
    expect(estado.atual[0].nome_razao_social).toBe('AGRO MMS S/A');
  });
});
