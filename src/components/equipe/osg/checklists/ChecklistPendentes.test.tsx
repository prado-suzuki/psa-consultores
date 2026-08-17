import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArquivoDaLinha, LinhaChecklist } from '@/lib/checklistDerivado';
import { ChecklistPendentes } from './ChecklistPendentes';

/**
 * O que estes testes protegem: a ÚNICA escrita da tela do consultor.
 *
 * A derivação em si tem teste próprio (checklistDerivado.test.ts) e aqui entra
 * mockada — o que se verifica é o fio entre o botão e a RPC: qual veredito sai,
 * com que motivo, e o que a tela mostra depois de cada estado.
 */

const mocks = vi.hoisted(() => ({
  revisar: vi.fn(),
  linhas: [] as LinhaChecklist[],
}));

vi.mock('@/hooks/useGestaoClientes', () => ({
  useClientesLista: () => ({ data: [{ id: 'cliente-1', nome: 'Fazenda Horizonte' }] }),
}));

vi.mock('@/hooks/useDocumentoArquivo', () => ({
  useRevisarDocumento: () => ({ mutate: mocks.revisar, isPending: false, variables: undefined }),
  // Os dois abaixo são do BotaoComprovante (EDU-7), que a tela renderiza.
  useDocumentosByCliente: () => ({ data: [] }),
  useUploaderNames: () => ({ data: {} }),
}));

vi.mock('@/hooks/useChecklistDerivado', () => ({
  useChecklistDerivado: () => ({
    linhas: mocks.linhas,
    solicitacao: { id: 'sol-1', status: 'em_checklist', enviadaEm: null, encerradaEm: null },
    arquivosSemTipo: 0,
    isLoading: false,
  }),
}));

const arquivo = (overrides: Partial<ArquivoDaLinha> = {}): ArquivoDaLinha => ({
  id: 'arq-1',
  nome: 'cpf-joao.pdf',
  revisao: 'pendente',
  motivo: null,
  fonte: 'cliente',
  ...overrides,
});

const linha = (overrides: Partial<LinhaChecklist> = {}): LinhaChecklist => ({
  chave: 'item-cpf|pessoa:p-joao',
  itemId: 'item-cpf',
  documento: 'CPF',
  nota: null,
  ordem: 1,
  granularidade: 'pessoa_pf',
  doCatalogo: true,
  confidencial: false,
  instancia: {
    chave: 'pessoa:p-joao',
    alvo: { kind: 'pessoa', id: 'p-joao' },
    cluster: 'pessoa_pf',
    label: 'João',
    detalhe: null,
  },
  status: 'recebido',
  documentoTipoId: 'tipo-cpf',
  arquivos: [arquivo()],
  ...overrides,
});

/**
 * A ficha só abre por clique no card; o modal é onde a revisão mora. O card é uma
 * área clicável com `aria-label` (e não um botão embrulhando o conteúdo) porque os
 * chips de estado, dentro dele, também são botões.
 */
const abrirFicha = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Ver os documentos de João/ }));
  return within(await screen.findByRole('dialog'));
};

describe('ChecklistPendentes — revisão do arquivo', () => {
  beforeEach(() => {
    mocks.revisar.mockReset();
    mocks.linhas = [linha()];
  });

  it('aprova o arquivo ainda não revisado', async () => {
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    const ficha = await abrirFicha(user);
    expect(ficha.getByText('A revisar')).toBeInTheDocument();
    await user.click(ficha.getByRole('button', { name: /Aprovar/ }));

    expect(mocks.revisar).toHaveBeenCalledWith({
      clienteId: 'cliente-1', documentoId: 'arq-1', veredito: 'aprovado',
    });
  });

  it('recusa passando o motivo que o cliente vai ler', async () => {
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    const ficha = await abrirFicha(user);
    await user.click(ficha.getByRole('button', { name: /Recusar/ }));

    await user.type(screen.getByLabelText(/O que o cliente precisa corrigir/), 'Página cortada');
    await user.click(screen.getByRole('button', { name: 'Recusar documento' }));

    expect(mocks.revisar).toHaveBeenCalledWith({
      clienteId: 'cliente-1',
      documentoId: 'arq-1',
      veredito: 'recusado',
      motivo: 'Página cortada',
    });
  });

  it('arquivo aprovado perde o botão de aprovar e ganha o de desfazer', async () => {
    mocks.linhas = [linha({ arquivos: [arquivo({ revisao: 'aprovado' })] })];
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    const ficha = await abrirFicha(user);
    expect(ficha.getByText('Aprovado')).toBeInTheDocument();
    expect(ficha.queryByRole('button', { name: /^Aprovar/ })).not.toBeInTheDocument();

    await user.click(ficha.getByRole('button', { name: /Desfazer revisão/ }));
    expect(mocks.revisar).toHaveBeenCalledWith({
      clienteId: 'cliente-1', documentoId: 'arq-1', veredito: 'pendente',
    });
  });

  it('recusado mostra o motivo e mantém a linha como pendente', async () => {
    mocks.linhas = [linha({
      status: 'pendente',
      arquivos: [arquivo({ revisao: 'recusado', motivo: 'Documento vencido' })],
    })];
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    const ficha = await abrirFicha(user);
    expect(ficha.getByText('Recusado')).toBeInTheDocument();
    expect(ficha.getByText('Documento vencido')).toBeInTheDocument();
    expect(ficha.getByText('Pendente')).toBeInTheDocument();
  });

  it('o chip do card abre a ficha só com o estado escolhido', async () => {
    mocks.linhas = [
      linha(),
      linha({
        chave: 'item-rg|pessoa:p-joao',
        itemId: 'item-rg',
        documento: 'RG',
        ordem: 2,
        arquivos: [arquivo({ id: 'arq-rg', nome: 'rg-joao.pdf', revisao: 'aprovado' })],
      }),
    ];
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    // O card mostra um chip por estado presente, com a contagem.
    await user.click(screen.getByRole('button', { name: /^Aprovado\s*1$/ }));

    const ficha = within(await screen.findByRole('dialog'));
    expect(ficha.getByText('RG')).toBeInTheDocument();
    expect(ficha.queryByText('CPF')).not.toBeInTheDocument();
    // E dá para voltar à ficha inteira sem fechar e reabrir.
    await user.click(ficha.getByRole('button', { name: /ver todos os 2/ }));
    expect(ficha.getByText('CPF')).toBeInTheDocument();
  });

  it('arquivo produzido pela PSA não é revisável', async () => {
    mocks.linhas = [linha({ arquivos: [arquivo({ fonte: 'psa', nome: 'parecer-interno.pdf' })] })];
    const user = userEvent.setup();
    render(<ChecklistPendentes clienteId="cliente-1" />);

    const ficha = await abrirFicha(user);
    expect(ficha.getByText('Enviado pela PSA')).toBeInTheDocument();
    expect(ficha.queryByRole('button', { name: /Aprovar/ })).not.toBeInTheDocument();
    expect(ficha.queryByRole('button', { name: /Recusar/ })).not.toBeInTheDocument();
  });
});
