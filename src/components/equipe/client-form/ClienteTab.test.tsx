// B17 (cluster obrigatório na tela), B18 (município e UF no cadastro) e
// B20 (a caixa do nome não é mexida) na aba "Dados do Cliente/Grupo".
//
// Os nomes usados aqui são de propósito outros que não o do teste e2e: provar
// que UM cadastro sobrevive não prova nada. O que precisa sobreviver é a classe
// de grafias em que a caixa carrega significado — sigla, abreviatura com ponto,
// tipo societário e marcador entre colchetes.
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ClienteTab from '@/components/equipe/client-form/ClienteTab';
import { defaultClientData } from '@/components/equipe/client-form/constants';
import { mapearPendencias, pendenciasCliente } from '@/lib/camposObrigatorios';

type DadosCliente = typeof defaultClientData;

const CLUSTERS = [
  { id: 'cl-agro', name: 'Agro' },
  { id: 'cl-industria', name: 'Indústria' },
];

/**
 * Monta a aba com estado real e devolve um leitor do que está gravado no
 * rascunho — é o que o salvamento enviaria.
 */
function montar(inicial: Partial<DadosCliente> = {}, comPendencias = false) {
  const estado = { atual: { ...defaultClientData, ...inicial } as DadosCliente };

  function Anfitriao() {
    const [clientData, setClientData] = useState<DadosCliente>(estado.atual);
    estado.atual = clientData;
    const mapa = comPendencias ? mapearPendencias(pendenciasCliente(clientData)) : null;
    return (
      <ClienteTab
        clientData={clientData}
        setClientData={setClientData}
        isReadOnly={false}
        allClusters={CLUSTERS}
        camposPendentes={mapa?.camposPorItem.get(0)}
        secoesPendentes={mapa?.secoesPorItem.get(0)}
      />
    );
  }

  render(<Anfitriao />);
  return estado;
}

const campoNome = () => screen.getByPlaceholderText('Ex: Grupo Empresarial Silva');

describe('B20 · a aba não normaliza a caixa do nome', () => {
  it.each([
    'AGRO MMS S/A',
    'J.E. Participações LTDA',
    '[HOMOLOG] Cliente XPTO',
    'Irmãos de Souza e Cia',
  ])('guarda %s exatamente como foi digitado, mesmo após sair do campo', async (nome) => {
    const user = userEvent.setup();
    const estado = montar();

    await user.click(campoNome());
    await user.paste(nome);
    await user.tab();

    expect(estado.atual.nome).toBe(nome);
    expect(campoNome()).toHaveValue(nome);
  });

  it('a única arrumação no blur é de espaço, e ela acontece à vista', async () => {
    const user = userEvent.setup();
    const estado = montar();

    await user.click(campoNome());
    await user.paste('   AGRO MMS   S/A  ');
    expect(estado.atual.nome).toBe('   AGRO MMS   S/A  ');

    await user.tab();
    expect(estado.atual.nome).toBe('AGRO MMS S/A');
    expect(campoNome()).toHaveValue('AGRO MMS S/A');
  });
});

describe('B18 · município e UF têm onde ser preenchidos', () => {
  it('o município digitado chega ao rascunho que o salvamento envia', async () => {
    const user = userEvent.setup();
    const estado = montar();

    expect(estado.atual.municipio).toBe('');
    await user.type(screen.getByPlaceholderText('Ex: Lucas do Rio Verde'), 'Sorriso');
    expect(estado.atual.municipio).toBe('Sorriso');
  });

  it('mostra o que já estava gravado (colunas que a tela antes ignorava)', () => {
    montar({ municipio: 'Nova Mutum', uf: 'MT' });
    expect(screen.getByPlaceholderText('Ex: Lucas do Rio Verde')).toHaveValue('Nova Mutum');
    // A UF é lista fechada: o valor gravado aparece no gatilho do seletor.
    expect(screen.getByText('MT')).toBeInTheDocument();
  });

  // A lista de UFs em si não é testada por interação: o `Select` do Radix não
  // abre em jsdom (usa `hasPointerCapture`, que o jsdom não implementa). O
  // conteúdo dela vem de `UF_STATES`, que já é uma constante compartilhada com
  // o cadastro de contribuinte.
});

describe('B17 · cluster é obrigatório na tela, não só na RPC', () => {
  it('o rótulo traz a marca de obrigatório', () => {
    montar();
    const rotulo = screen.getByText('Clusters').closest('label');
    expect(rotulo?.textContent).toContain('*');
  });

  it('sem cluster, a tela diz o que a RPC diria', () => {
    montar({ nome: 'Fazenda Boa Vista S.A.', cluster_ids: [] }, true);
    expect(screen.getByText('Selecione ao menos 1 cluster')).toBeInTheDocument();
  });

  it('com cluster escolhido, a falta some', async () => {
    const user = userEvent.setup();
    const estado = montar({ nome: 'Fazenda Boa Vista S.A.', cluster_ids: [] }, true);

    await user.click(screen.getByText('Selecione...'));
    await user.click(await screen.findByText('Agro'));

    expect(estado.atual.cluster_ids).toEqual(['cl-agro']);
    expect(screen.queryByText('Selecione ao menos 1 cluster')).not.toBeInTheDocument();
  });
});
