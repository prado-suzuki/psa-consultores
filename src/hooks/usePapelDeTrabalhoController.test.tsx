import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePapelDeTrabalhoController } from '@/hooks/usePapelDeTrabalhoController';

/**
 * Confere o controlador da tela de conferência do WP.
 *
 * O que ele prova, e que nenhum teste de baixo prova: que a corrente inteira roda
 * a partir de um `File`, do jeito que roda no navegador. Os testes das quatro
 * peças puras usam `Uint8Array`; aqui entra o objeto que o `input type=file`
 * entrega, e é onde erro de `arrayBuffer` ou de estado apareceria.
 */

const FIXTURES = join(__dirname, '..', 'lib', 'planejamento-tributario', '__fixtures__');

function arquivo(caso: string, nome = `${caso}.xlsx`): File {
  return new File([readFileSync(join(FIXTURES, caso, 'entrada.xlsx'))], nome, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('usePapelDeTrabalhoController', () => {
  it('começa vazio, sem análise e sem erro', () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    expect(result.current.estado).toBe('vazio');
    expect(result.current.analise).toBeNull();
    expect(result.current.erro).toBeNull();
  });

  it('lê um WP bom a partir de um File e aceita', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('resumo-pfxpj-x-pjxpj', 'WP do cliente.xlsx'));
    });

    await waitFor(() => expect(result.current.estado).toBe('pronto'));
    expect(result.current.analise?.nomeDoArquivo).toBe('WP do cliente.xlsx');
    expect(result.current.analise?.decisao.veredito).toBe('aceita');
    expect(result.current.analise?.resumo.valores).toBeGreaterThan(0);
  });

  /*
   * O resumo existe para a tela não recontar a cada render. Se ele divergir da
   * leitura, a contagem na tela mente sobre o que entrou.
   */
  it('o resumo bate com a leitura, bloco a bloco', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('bens-e-dividas'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    const { leitura, resumo } = result.current.analise!;
    expect(resumo.valores).toBe(leitura.valores.length);
    expect(resumo.bens).toBe(leitura.bens.length);
    expect(resumo.dividas).toBe(leitura.dividas.length);
    expect(resumo.farol).toBe(leitura.farol.length);
    expect(resumo.comentarios).toBe(leitura.comentarios.length);
  });

  it('traz os anos em ordem e a aba de onde vieram', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('transferencia-rural'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    expect(result.current.analise?.resumo.anos).toEqual([2026, 2027, 2028, 2029, 2030, 2031, 2032]);
    expect(result.current.analise?.resumo.abasLidas).toEqual(['Cenário 02 (Venda de Ativos)']);
  });

  /*
   * O WP chama o mesmo cenário por dois nomes, `Cenário 01` no cabeçalho de coluna
   * do `Resumo` e `Cenário 01 (PFxPJ)` no nome da aba. A tela mostrava os dois e
   * três cenários pareciam sete. `abasLidas` conta aba, não cenário: uma entrada
   * por aba que produziu dado, sem duplicar vocabulário.
   */
  it('conta aba, e não cenário: uma entrada por aba lida', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('bens-e-dividas'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    const abas = result.current.analise!.resumo.abasLidas;
    expect(abas).toEqual(['Bens da Atv. Rural', 'Dívidas da Atv. Rural']);
    expect(new Set(abas).size).toBe(abas.length);
  });

  /*
   * Recusa não é erro: o arquivo abriu e foi lido, e a tela precisa mostrar o que
   * impede. Se caísse em `falhou`, a pessoa veria só "não consegui abrir" e não
   * teria o endereço da célula para consertar.
   */
  it('arquivo que não é um WP fica pronto com recusa, não com falha', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('comentarios'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    expect(result.current.analise?.decisao.veredito).toBe('recusa');
    expect(result.current.analise?.decisao.impedimentos.length).toBeGreaterThan(0);
  });

  /*
   * **A biblioteca de planilha nunca lança.** Medido: texto puro, arquivo vazio,
   * bytes aleatórios e um PDF falso, todos voltam como planilha sem aba nenhuma
   * conhecida, e é a régua de recusa que barra. Então o caminho de arquivo
   * trocado é `pronto` com recusa, e não `falhou`, e o que a pessoa vê é a lista
   * de abas esperadas contra as que o arquivo tem, que é acionável.
   *
   * O `falhou` fica como rede para a leitura do arquivo em si dar errado, por
   * exemplo o arquivo sumir do disco no meio. Não dá para provocar em teste.
   */
  it.each([
    ['texto puro', 'isto nao e uma planilha'],
    ['arquivo vazio', ''],
  ])('%s é recusado com a lista de abas esperadas', async (_nome, conteudo) => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(new File([conteudo], 'foto.xlsx'));
    });

    await waitFor(() => expect(result.current.estado).toBe('pronto'));
    expect(result.current.analise?.decisao.veredito).toBe('recusa');
    expect(result.current.analise?.decisao.impedimentos[0].tipo).toBe('aba_ausente');
    expect(result.current.analise?.decisao.impedimentos[0].detalhe).toContain('Esperava uma de');
  });

  it('limpar devolve a tela ao estado inicial', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('dre'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    act(() => result.current.limpar());

    expect(result.current.estado).toBe('vazio');
    expect(result.current.analise).toBeNull();
    expect(result.current.erro).toBeNull();
  });

  /*
   * A versão do mapa acompanha a análise porque é a régua com que aquele arquivo
   * foi lido, e é ela que a importação grava para a revisão continuar explicável
   * quando o modelo mudar.
   */
  it('carrega a versão do mapa junto da análise', async () => {
    const { result } = renderHook(() => usePapelDeTrabalhoController());

    await act(async () => {
      await result.current.analisar(arquivo('dre'));
    });
    await waitFor(() => expect(result.current.estado).toBe('pronto'));

    expect(result.current.analise?.versaoDoMapa).toMatch(/^\d+\.\d+$/);
  });
});
