import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';
import { OrgaoGovernancaModal } from '@/components/equipe/osg/governanca/OrgaoGovernancaModal';
import type { OrgaoGovernanca } from '@/hooks/useDomainOrgaoGovernanca';

/**
 * O modal é puro: só `useState`, funções do catálogo e componentes de UI.
 *
 * O `TooltipProvider` reproduz o que o `App.tsx` põe em volta da aplicação
 * inteira. Sem ele o Radix recusa qualquer `Tooltip`, e as ajudas dos campos
 * derrubariam o render.
 */
function montar(over: Partial<Parameters<typeof OrgaoGovernancaModal>[0]> = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  render(
    <TooltipProvider>
      <OrgaoGovernancaModal
        open
        onOpenChange={vi.fn()}
        onSalvar={onSalvar}
        salvando={false}
        proximaOrdem={3}
        {...over}
      />
    </TooltipProvider>,
  );
  return { onSalvar };
}

const orgaoSalvo = (over: Partial<OrgaoGovernanca> = {}) => ({
  id: 'o1',
  nome: 'Conselho de Administração',
  entra_no_contrato: true,
  ordem: 1,
  vigencia_inicio: null,
  vigencia_fim: null,
  genero: 'M',
  membros_minimo: 3,
  membros_maximo: 6,
  mandato_anos: 3,
  cargos_do_orgao: null,
  padrao_chave: 'conselho_administracao',
  ...over,
}) as OrgaoGovernanca;

describe('o artigo se mostra, não se pergunta', () => {
  it('escreve a frase que vai sair no contrato assim que o nome é digitado', async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Comitê de Auditoria');

    expect(screen.getByText(/O Comitê de Auditoria será composto por/)).toBeInTheDocument();
    // A pergunta gramatical não existe na tela.
    expect(screen.queryByText(/Gênero/i)).not.toBeInTheDocument();
  });

  it('concorda o particípio junto com o artigo', async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Diretoria Executiva');

    expect(screen.getByText(/A Diretoria Executiva será composta por/)).toBeInTheDocument();
  });

  it('"trocar" inverte o palpite e se anuncia como escolha à mão', async () => {
    /*
     * O aviso e o desfazer nasceram da validação de 14/09: o usuário viu
     * "O Reunião de Sócios será composto" e me perguntou de onde vinha o
     * masculino. Vinha de um clique no trocar, mas a tela não dizia isso, e
     * ficava idêntica a uma que nunca foi tocada.
     */
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Conselho Gestor');
    expect(screen.getByText(/O Conselho Gestor será composto/)).toBeInTheDocument();
    expect(screen.queryByText(/ajustado à mão/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'trocar' }));

    expect(screen.getByText(/A Conselho Gestor será composta/)).toBeInTheDocument();
    expect(screen.getByText(/ajustado à mão/)).toBeInTheDocument();
  });

  it('"voltar ao automático" desfaz a troca', async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Reunião de Sócios');
    await userEvent.click(screen.getByRole('button', { name: 'trocar' }));
    expect(screen.getByText(/O Reunião de Sócios será composto/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'voltar ao automático' }));

    expect(screen.getByText(/A Reunião de Sócios será composta/)).toBeInTheDocument();
    expect(screen.queryByText(/ajustado à mão/)).not.toBeInTheDocument();
  });

  it('só pergunta quando o palpite falha E o órgão entra no contrato', async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Xyzzy Plugh');

    // Fora do contrato o gênero não é usado, então não se pergunta nada.
    expect(screen.queryByText(/Como se escreve este nome/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeEnabled();

    await userEvent.click(screen.getByLabelText(/Recebe competência/));

    expect(screen.getByText(/Como se escreve este nome/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'A Xyzzy Plugh' }));
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeEnabled();
  });
});

describe('composição', () => {
  it('manda os números como número e os cargos como lista', async () => {
    const { onSalvar } = montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Conselho Fiscal');
    await userEvent.type(screen.getByLabelText(/M.nimo de membros/), '3');
    await userEvent.type(screen.getByLabelText(/M.ximo de membros/), '5');
    await userEvent.type(screen.getByLabelText(/Mandato, em anos/), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Presidente' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Conselho Fiscal',
      genero: 'M',
      membros_minimo: 3,
      membros_maximo: 5,
      mandato_anos: 2,
      cargos_do_orgao: ['Presidente'],
    }));
  });

  it('campo em branco vai como nulo, e não como zero', async () => {
    // A Reunião de Sócios é assim: não tem membro, mandato nem cargo.
    const { onSalvar } = montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Reunião de Sócios');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({
      membros_minimo: null,
      membros_maximo: null,
      mandato_anos: null,
      cargos_do_orgao: null,
    }));
  });

  it('máximo menor que o mínimo trava o salvar', async () => {
    montar();
    await userEvent.type(screen.getByLabelText(/Nome do órgão/), 'Conselho Fiscal');
    await userEvent.type(screen.getByLabelText(/M.nimo de membros/), '6');
    await userEvent.type(screen.getByLabelText(/M.ximo de membros/), '3');

    expect(screen.getByText(/máximo de membros não pode ser menor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cadastrar' })).toBeDisabled();
  });

  it('cargo repetido não entra duas vezes', async () => {
    montar();
    const campo = screen.getByLabelText(/Cargos do órgão/);
    await userEvent.type(campo, 'Presidente{Enter}');
    await userEvent.type(campo, 'presidente{Enter}');

    expect(screen.getAllByRole('button', { name: /Tirar/ })).toHaveLength(1);
  });
});

describe('edição de órgão já cadastrado', () => {
  it('carrega a parametrização gravada', () => {
    montar({ orgao: orgaoSalvo({ cargos_do_orgao: ['Presidente', 'Secretário'] }) });

    expect(screen.getByLabelText(/M.nimo de membros/)).toHaveValue(3);
    expect(screen.getByLabelText(/M.ximo de membros/)).toHaveValue(6);
    expect(screen.getByLabelText(/Mandato, em anos/)).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'Tirar Secretário' })).toBeInTheDocument();
  });

  it('gênero gravado que DISCORDA do palpite sobrevive a reabrir', () => {
    // Alguém trocou de propósito: "Conselho" chutaria M, e está gravado F.
    montar({ orgao: orgaoSalvo({ nome: 'Conselho Gestor', genero: 'F' }) });

    expect(screen.getByText(/A Conselho Gestor será composta/)).toBeInTheDocument();
  });

  it('gênero que CONCORDA com o palpite volta a seguir o nome ao renomear', async () => {
    montar({ orgao: orgaoSalvo({ nome: 'Conselho Gestor', genero: 'M' }) });
    const nome = screen.getByLabelText(/Nome do órgão/);

    await userEvent.clear(nome);
    await userEvent.type(nome, 'Diretoria Nova');

    expect(screen.getByText(/A Diretoria Nova será composta/)).toBeInTheDocument();
  });

  it('não perde o mandato ao salvar sem mexer nele', async () => {
    const { onSalvar } = montar({ orgao: orgaoSalvo() });
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({
      mandato_anos: 3,
      membros_minimo: 3,
      membros_maximo: 6,
      genero: 'M',
    }));
  });
});

describe('a lista de cargos', () => {
  it('tira um cargo pelo x', async () => {
    montar({ orgao: orgaoSalvo({ cargos_do_orgao: ['Presidente', 'Secretário'] }) });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar Presidente' }));

    const restantes = screen.getAllByRole('button', { name: /Tirar/ });
    expect(restantes).toHaveLength(1);
    expect(within(restantes[0].parentElement!).getByText('Secretário')).toBeInTheDocument();
  });
});
