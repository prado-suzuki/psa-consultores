import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

/**
 * O marcador de "já olhei o sino", por usuário e por navegador.
 *
 * Existe porque duas das quatro fontes do sino são DERIVADAS e não têm onde
 * receber um carimbo de leitura — o porquê inteiro está no cabeçalho de
 * `src/lib/sinoNotificacoes.ts`. Aqui fica só a mecânica: ler, gravar e manter o
 * valor em estado para a bolinha recalcular na hora em que o balão abre.
 *
 * **Não guarda papel nem dado de negócio**, então não esbarra na regra que proíbe
 * `localStorage` (essa é sobre `user_roles`): o que mora aqui é uma preferência
 * de visualização, do tipo que se perde sem prejuízo nenhum.
 *
 * **Toda leitura e toda escrita em `try/catch`.** `localStorage` lança em janela
 * anônima com dados de site bloqueados, e o sino é do cabeçalho: uma exceção aqui
 * derrubaria a área inteira por causa de uma bolinha.
 */

export const chaveDoSinoVisto = (userId: string) => `psa:sino-visto:${userId}`;

function ler(userId: string | undefined): string | null {
  if (!userId) return null;
  try {
    return window.localStorage.getItem(chaveDoSinoVisto(userId));
  } catch {
    return null;
  }
}

export function useSinoVisto() {
  const { user } = useAuth();
  const userId = user?.id;

  // Inicialização preguiçosa: sem isto, cada render do cabeçalho faria uma
  // leitura síncrona de `localStorage`.
  const [vistoEm, setVistoEm] = useState<string | null>(() => ler(userId));

  // O `user` do contexto chega DEPOIS do primeiro render (a sessão é resolvida em
  // efeito), e sem esta releitura o marcador ficaria nulo para sempre em quem
  // recarrega a página com o sino na tela: a bolinha voltaria a contar chamado
  // que a pessoa já tinha visto. Também troca de dono quando outra pessoa entra
  // na mesma aba.
  useEffect(() => {
    setVistoEm(ler(userId));
  }, [userId]);

  const marcarVisto = useCallback(() => {
    const agora = new Date().toISOString();
    setVistoEm(agora);
    if (!userId) return;
    try {
      window.localStorage.setItem(chaveDoSinoVisto(userId), agora);
    } catch {
      // Sem armazenamento, o marcador vale só enquanto a aba estiver aberta — a
      // bolinha volta no recarregamento, que é o comportamento antigo.
    }
  }, [userId]);

  return { vistoEm, marcarVisto };
}
