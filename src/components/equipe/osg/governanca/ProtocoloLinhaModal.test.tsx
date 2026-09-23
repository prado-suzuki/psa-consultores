import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/equipe/osg/HistoricoFlutuante', () => ({
  HistoricoFlutuante: ({ entityIds }: { entityIds: string[] }) => (
    <div data-testid="historico">{entityIds.join(',')}</div>
  ),
}));

import { ProtocoloLinhaModal } from '@/components/equipe/osg/governanca/ProtocoloLinhaModal';
import type { LinhaDaGrade } from '@/lib/protocoloRemuneracao';

/*
 * Duas colunas reais do Potrich, e um item real do modelo da casa. A segunda
 * célula nasce vazia de propósito: metade dos casos desta tela é preencher o que
 * está em branco.
 */
const LINHA: LinhaDaGrade = {
  linha_id: 'l-modelo',
  item_id: 'i-modelo',
  item: 'Modelo do Veículo',
  celulas: [
    {
      beneficiario_id: 'b-fund',
      beneficiario: 'Sócios Fundadores',
      texto: 'Veículo utilitário até R$ 600.000,00',
    },
    { beneficiario_id: 'b-suc', beneficiario: 'Sucessores na Gestão', texto: null },
  ],
};

const OUTRA: LinhaDaGrade = {
  linha_id: 'l-abastecimento',
  item_id: 'i-abastecimento',
  item: 'Abastecimento',
  celulas: [
    { beneficiario_id: 'b-fund', beneficiario: 'Sócios Fundadores', texto: 'Por conta da sociedade' },
    { beneficiario_id: 'b-suc', beneficiario: 'Sucessores na Gestão', texto: null },
  ],
};

function montar(over: Partial<Parameters<typeof ProtocoloLinhaModal>[0]> = {}) {
  const onSalvar = vi.fn().mockResolvedValue(undefined);
  const onOpenChange = vi.fn();
  const onTirarDoProtocolo = vi.fn();
  const utils = render(
    <ProtocoloLinhaModal
      open
      onOpenChange={onOpenChange}
      linha={LINHA}
      salvando={false}
      mostrarHistorico={false}
      onSalvar={onSalvar}
      onTirarDoProtocolo={onTirarDoProtocolo}
      {...over}
    />,
  );
  return { onSalvar, onOpenChange, onTirarDoProtocolo, ...utils };
}

describe('a caixa mostra a linha que foi aberta', () => {
  it('abre com o item no título e um campo por coluna, na ordem da grade', () => {
    montar();

    expect(screen.getByText('Modelo do Veículo')).toBeInTheDocument();
    expect(screen.getByLabelText('Sócios Fundadores')).toHaveValue(
      'Veículo utilitário até R$ 600.000,00',
    );
    expect(screen.getByLabelText('Sucessores na Gestão')).toHaveValue('');
  });

  it('TROCA O CONTEÚDO ao mudar de linha com a caixa aberta', async () => {
    /*
     * Este é o defeito que erra calado. O botão "Salvar e ir para o próximo"
     * troca a linha SEM fechar a caixa: se o efeito que recarrega os campos
     * dependesse de `open` em vez do id da linha, o item seguinte apareceria com
     * o texto do anterior, e quem estivesse preenchendo rápido salvaria a regra
     * do veículo dentro do abastecimento.
     */
    const { rerender } = montar();
    expect(screen.getByLabelText('Sócios Fundadores')).toHaveValue(
      'Veículo utilitário até R$ 600.000,00',
    );

    rerender(
      <ProtocoloLinhaModal
        open
        onOpenChange={vi.fn()}
        linha={OUTRA}
        salvando={false}
        mostrarHistorico={false}
        onSalvar={vi.fn()}
        onTirarDoProtocolo={vi.fn()}
      />,
    );

    expect(screen.getByText('Abastecimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Sócios Fundadores')).toHaveValue('Por conta da sociedade');
  });
});

describe('o que a caixa devolve ao salvar', () => {
  it('manda uma célula por coluna, cada texto no seu beneficiário', async () => {
    const { onSalvar } = montar();

    await userEvent.type(screen.getByLabelText('Sucessores na Gestão'), 'Hilux SRX');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith([
      { beneficiario_id: 'b-fund', texto: 'Veículo utilitário até R$ 600.000,00' },
      { beneficiario_id: 'b-suc', texto: 'Hilux SRX' },
    ]);
  });

  it('esvaziar o campo manda vazio, que é como se apaga a regra', async () => {
    /*
     * Não pode mandar o texto antigo "porque o campo ficou em branco": é assim
     * que uma regra revogada continuaria no documento. O `regrasParaSalvar`
     * transforma o vazio em apagamento, e quem manda o vazio é esta caixa.
     */
    const { onSalvar } = montar();

    await userEvent.clear(screen.getByLabelText('Sócios Fundadores'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSalvar).toHaveBeenCalledWith([
      { beneficiario_id: 'b-fund', texto: '' },
      { beneficiario_id: 'b-suc', texto: '' },
    ]);
  });

  it('"Não se aplica" é texto, e não some junto com o vazio', async () => {
    const { onSalvar } = montar();

    await userEvent.type(screen.getByLabelText('Sucessores na Gestão'), 'Não se aplica');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const celulas = onSalvar.mock.calls[0][0] as Array<{ beneficiario_id: string; texto: string }>;
    expect(celulas.find((c) => c.beneficiario_id === 'b-suc')?.texto).toBe('Não se aplica');
  });
});

describe('os caminhos de saída', () => {
  it('sem próxima linha, o botão de pular nem aparece', () => {
    montar();
    expect(screen.queryByRole('button', { name: /ir para o próximo/i })).not.toBeInTheDocument();
  });

  it('com próxima linha, salva e avança sem fechar a caixa', async () => {
    const onProxima = vi.fn();
    const { onSalvar, onOpenChange } = montar({ onProxima });

    await userEvent.click(screen.getByRole('button', { name: /ir para o próximo/i }));

    expect(onSalvar).toHaveBeenCalled();
    expect(onProxima).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('salvar sem avançar fecha a caixa', async () => {
    const { onOpenChange } = montar();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('tirar do protocolo não salva nada, só pede a confirmação de fora', async () => {
    const { onSalvar, onTirarDoProtocolo } = montar();

    await userEvent.click(screen.getByRole('button', { name: /Tirar do protocolo/i }));

    expect(onTirarDoProtocolo).toHaveBeenCalled();
    expect(onSalvar).not.toHaveBeenCalled();
  });
});

describe('o painel de histórico', () => {
  it('fica fora enquanto o cliente não tem documento gerado', () => {
    montar();
    expect(screen.queryByTestId('historico')).not.toBeInTheDocument();
  });

  it('quando entra, pergunta pelo histórico DESTA linha', () => {
    montar({ mostrarHistorico: true });
    expect(screen.getByTestId('historico')).toHaveTextContent('l-modelo');
  });
});
