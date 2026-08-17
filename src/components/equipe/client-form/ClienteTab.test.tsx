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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

  // O provedor é necessário desde que o município virou lista do IBGE: o campo
  // consulta por UF. `retry: false` para o caso de erro falhar de uma vez.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <Anfitriao />
    </QueryClientProvider>,
  );
  return estado;
}

/**
 * Municípios de MT como o IBGE devolve, com o aninhado que o parser descarta.
 *
 * A rede é simulada de propósito: teste que depende do IBGE no ar não é teste.
 */
const MUNICIPIOS_MT = ['Cuiabá', 'Nova Mutum', 'Sorriso'].map((nome) => ({
  id: 5100000,
  nome,
  microrregiao: { mesorregiao: { UF: { sigla: 'MT' } } },
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => MUNICIPIOS_MT }) as unknown as Response),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

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
  // O município deixou de ser campo aberto: virou lista da UF (tarefa [4] da
  // sprint 11). Digitar não é mais o caminho, e sem UF não há lista.
  it('sem UF, o município não pode ser preenchido e a tela diz por quê', () => {
    montar();

    const campo = screen.getByRole('button', { name: /Escolha a UF primeiro/ });
    expect(campo).toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mostra o que já estava gravado (colunas que a tela antes ignorava)', () => {
    montar({ municipio: 'Nova Mutum', uf: 'MT' });

    // Município e UF aparecem no gatilho de cada seletor.
    expect(screen.getByText('Nova Mutum')).toBeInTheDocument();
    expect(screen.getByText('MT')).toBeInTheDocument();
  });

  // Achado na validação de tela: o Radix não mostrava valor nem placeholder
  // quando recebia "MATO GROSSO", e o campo parecia vazio num cliente que TEM
  // UF preenchida. O seletor passou a receber a sigla.
  it('UF gravada por extenso aparece como sigla, e não como campo vazio', () => {
    montar({ municipio: 'CUIABA', uf: 'MATO GROSSO' });

    expect(screen.getByText('MT')).toBeInTheDocument();
    expect(screen.queryByText('MATO GROSSO')).not.toBeInTheDocument();
  });

  it('consulta a lista da UF gravada, uma vez', async () => {
    montar({ municipio: 'Nova Mutum', uf: 'MT' });

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/estados/MT/municipios');
  });

  // A UF por extenso é metade do dado gravado hoje, herança de importação por
  // planilha. Se a tradução para sigla falhasse, o campo nasceria sem lista.
  it('UF por extenso também resolve a lista', async () => {
    montar({ municipio: 'CUIABA', uf: 'MATO GROSSO' });

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain('/estados/MT/municipios');
  });

  it('valor gravado que não é município da UF é marcado, não apagado', async () => {
    montar({ municipio: 'Mapito', uf: 'MT' });

    expect(await screen.findByText(/Não é município de MT/)).toBeInTheDocument();
    // Continua na tela: apagar em silêncio perderia o dado sem ninguém ver.
    expect(screen.getByText('Mapito')).toBeInTheDocument();
  });

  it('IBGE fora do ar não trava o cadastro: oferece digitar', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('sem rede'));
    const user = userEvent.setup();
    const estado = montar({ uf: 'MT' });

    // Espera folgada: o hook tenta de novo uma vez antes de desistir, e a nova
    // tentativa tem atraso próprio.
    await user.click(await screen.findByRole('button', { name: 'digitar' }, { timeout: 5000 }));
    await user.type(screen.getByPlaceholderText('Ex: Lucas do Rio Verde'), 'Sorriso');

    expect(estado.atual.municipio).toBe('Sorriso');
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
