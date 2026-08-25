// B20 · a metade compensatória da migração no módulo fiscal.
//
// A migração 20260813103000 tira o `initcap()` de três campos, e dois deles são
// do contribuinte: razão social e nome fantasia. Se a arrumação na escrita
// ficasse só no nome do cliente, metade do alcance da migração ficaria sem o
// "arrumar com o usuário vendo" que o B20 pede.
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Papel mutável: cada teste escolhe quem está logado. Os três flags são
// estritos de propósito, como no AuthContext real — admin não engloba os outros.
const papel = vi.hoisted(() => ({ isAdmin: true, isLider: false, isSublider: false }));
const avisos = vi.hoisted(() => ({ warning: vi.fn(), success: vi.fn(), error: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => papel }));
vi.mock('sonner', () => ({ toast: avisos }));
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

function montar(over: Partial<DraftEntity> = {}) {
  const estado = { atual: [contribuinte(over)] as DraftEntity[] };

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
      />
    );
  }

  render(<TooltipProvider><Anfitriao /></TooltipProvider>);
  return estado;
}

beforeEach(() => {
  papel.isAdmin = true;
  papel.isLider = false;
  papel.isSublider = false;
  avisos.warning.mockClear();
});

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

// A lixeira não é mais privilégio de admin. Linha que nunca foi salva (sem
// `_dbId`) sai da lista por qualquer um que edite o formulário — nada vai ao
// banco. Linha já salva exige sublíder ou superior, o teto da policy
// `rls_contribuinte_update`.
describe('lixeira de contribuinte', () => {
  it('team_member remove linha que ainda não foi salva, sem checagem de papel', async () => {
    papel.isAdmin = false;
    const user = userEvent.setup();
    const estado = montar(); // sem _dbId: a linha nunca foi ao banco

    await user.click(screen.getByRole('button', { name: 'Remover contribuinte' }));
    expect(await screen.findByText(/Nada será removido do banco/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover' }));

    expect(estado.atual).toHaveLength(0);
    expect(avisos.warning).not.toHaveBeenCalled();
  });

  it('team_member é barrado ao excluir contribuinte já salvo, com o motivo correto', async () => {
    papel.isAdmin = false;
    const user = userEvent.setup();
    const estado = montar({ _dbId: 'db-1' });

    await user.click(screen.getByRole('button', { name: 'Remover contribuinte (sem permissão)' }));

    expect(avisos.warning).toHaveBeenCalledWith(expect.stringMatching(/Sublíder ou superior/));
    expect(estado.atual).toHaveLength(1);
  });

  it('sublíder exclui contribuinte já salvo', async () => {
    papel.isAdmin = false;
    papel.isSublider = true;
    const user = userEvent.setup();
    const estado = montar({ _dbId: 'db-1' });

    await user.click(screen.getByRole('button', { name: 'Remover contribuinte' }));
    await user.click(await screen.findByRole('button', { name: 'Remover' }));

    expect(estado.atual).toHaveLength(0);
  });
});
