import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';

/**
 * Traz os chunks das páginas DEPOIS que a tela já apareceu.
 *
 * O PORQUÊ. As rotas do `App.tsx` são `lazy`, então a primeira visita a cada
 * uma custa um GET. Foi exatamente essa espera que fez o commit `ba0c461b`
 * reverter a divisão em abril — a queixa registrada foi "demora ao mudar de
 * página". Este componente devolve a navegação instantânea sem devolver o
 * pacote único: os mesmos bytes descem, mas em prioridade de ociosidade e
 * depois do primeiro paint, em vez de antes dele.
 *
 * A troca que isso representa, dita por inteiro: o total baixado por uma sessão
 * que fica aberta é parecido com o de antes. O que muda é a ORDEM — a tela
 * aparece primeiro. É a ordem que o usuário sente.
 *
 * QUATRO GUARDAS, e cada uma existe por um motivo:
 *
 * 1. `user` — visitante anônimo na landing não baixa as páginas internas. Sem
 *    isso, quem só quer ler o site institucional pagaria pelo sistema inteiro.
 * 2. `saveData` / rede lenta — em dados móveis economizar é o pedido explícito
 *    do usuário, e prefetch é justamente o tráfego dispensável.
 * 3. ociosidade, um chunk por vez — prefetch que compete com a navegação real
 *    piora o que veio consertar. `requestIdleCallback` cede a vez, e a fila
 *    sequencial evita abrir cem conexões de uma vez.
 * 4. `navigator.webdriver` — o `e2e/smoke.spec.ts` espera por
 *    `waitForLoadState('networkidle')`, e uma fila de prefetch em ociosidade
 *    nunca deixa a rede assentar: cada navegação da suíte esperaria o timeout
 *    inteiro antes de seguir. O Playwright marca essa flag, e a sessão
 *    automatizada não tem navegação humana para acelerar.
 *
 * Só o import dinâmico basta: o módulo já resolvido fica no cache do browser e
 * do próprio bundler, então o `lazy` da rota, quando ela é aberta de verdade,
 * não busca nada de novo.
 */

// Um glob estático é o que permite ao Vite conhecer a lista em tempo de build.
// Manter fora do componente também garante uma lista só por processo.
//
// A exclusão dos `.test.tsx` NÃO é cosmética: as páginas têm teste colocado ao
// lado, e sem o padrão negativo eles entrariam no bundle de produção.
const PAGINAS = import.meta.glob(['/src/pages/**/*.tsx', '!/src/pages/**/*.test.tsx']);

/** `requestIdleCallback` não existe no Safari mais antigo; o timer serve igual. */
function quandoOcioso(tarefa: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(tarefa, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(tarefa, 2000);
  return () => window.clearTimeout(id);
}

function redePedeEconomia(): boolean {
  const conexao = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conexao) return false;
  if (conexao.saveData) return true;
  return conexao.effectiveType === 'slow-2g' || conexao.effectiveType === '2g';
}

export const PrefetchDeRotas = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (navigator.webdriver) return;
    if (redePedeEconomia()) return;

    let cancelado = false;
    const fila = Object.values(PAGINAS);

    const proximo = (): void => {
      if (cancelado) return;
      const carregar = fila.shift();
      if (!carregar) return;
      // Falha de prefetch é silenciosa de propósito: o chunk será buscado de
      // novo quando a rota for aberta, e aí o erro tem onde aparecer (o
      // ErrorBoundary da rota). Avisar aqui só produziria ruído de console.
      void carregar()
        .catch(() => undefined)
        .then(() => quandoOcioso(proximo));
    };

    const cancelaPrimeiro = quandoOcioso(proximo);
    return () => {
      cancelado = true;
      cancelaPrimeiro();
    };
  }, [user]);

  return null;
};
