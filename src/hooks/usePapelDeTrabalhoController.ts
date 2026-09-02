import { useCallback, useState } from 'react';

import { lerWp, type ResultadoLeitura } from '@/lib/planejamento-tributario/parser';
import { decideImportacao, type Decisao } from '@/lib/planejamento-tributario/recusa';
import { validar } from '@/lib/planejamento-tributario/validacoes';
import { VERSAO_DO_MAPA } from '@/lib/planejamento-tributario/mapa';

/**
 * Controla a tela de conferência do papel de trabalho.
 *
 * É hook de controle de tela, e não de domínio: **não fala com o Supabase**. Ele
 * junta as quatro peças puras da leitura, `mapa`, `parser`, `validacoes` e
 * `recusa`, e devolve o que a tela desenha. Toda a análise acontece no navegador,
 * sem subir arquivo para lugar nenhum.
 *
 * Isso é decisão, não limitação: o Fiscal precisa ver o que entrou **antes** de
 * gravar, e um arquivo que vai ser recusado não tem por que ocupar o bucket.
 * Quem grava é `useDomainPapelDeTrabalho`, que chama a RPC depois do aceite.
 *
 * **A leitura roda na thread principal.** Um WP tem uns 2 MB e leva menos de um
 * segundo, então não vale a complexidade de um worker; se um dia travar a tela em
 * arquivo grande, é aqui que o worker entra.
 */

export type EstadoDaAnalise = 'vazio' | 'lendo' | 'pronto' | 'falhou';

/** Quanto de cada bloco a leitura trouxe, para a tela mostrar sem recontar. */
export interface ResumoDaLeitura {
  valores: number;
  farol: number;
  comentarios: number;
  bens: number;
  dividas: number;
  /** Anos distintos encontrados nos valores, em ordem. */
  anos: number[];
  /** Cenários distintos encontrados, em ordem de leitura. */
  cenarios: string[];
}

export interface Analise {
  nomeDoArquivo: string;
  tamanho: number;
  versaoDoMapa: string;
  leitura: ResultadoLeitura;
  decisao: Decisao;
  resumo: ResumoDaLeitura;
}

function resume(leitura: ResultadoLeitura): ResumoDaLeitura {
  return {
    valores: leitura.valores.length,
    farol: leitura.farol.length,
    comentarios: leitura.comentarios.length,
    bens: leitura.bens.length,
    dividas: leitura.dividas.length,
    anos: [...new Set(leitura.valores.map((v) => v.ano))].sort((a, b) => a - b),
    cenarios: [...new Set(leitura.valores.map((v) => v.cenario))],
  };
}

export function usePapelDeTrabalhoController() {
  const [estado, setEstado] = useState<EstadoDaAnalise>('vazio');
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const analisar = useCallback(async (arquivo: File) => {
    setEstado('lendo');
    setErro(null);
    setAnalise(null);

    try {
      const leitura = lerWp(new Uint8Array(await arquivo.arrayBuffer()));
      const daValidacao = validar(leitura.valores);
      const decisao = decideImportacao(leitura, daValidacao);

      setAnalise({
        nomeDoArquivo: arquivo.name,
        tamanho: arquivo.size,
        versaoDoMapa: VERSAO_DO_MAPA,
        /*
         * Os problemas da validação entram na leitura para a tela ter uma lista
         * só. A decisão já os separou em impede e avisa, e é por ela que a tela
         * se guia; isto aqui é só para nada se perder no caminho.
         */
        leitura: { ...leitura, problemas: [...leitura.problemas, ...daValidacao] },
        decisao,
        resumo: resume(leitura),
      });
      setEstado('pronto');
    } catch (causa) {
      /*
       * Rede de segurança, e quase inalcançável. **A biblioteca de planilha não
       * lança em arquivo ruim:** medindo texto puro, arquivo vazio, bytes
       * aleatórios e um PDF falso, os quatro voltam como planilha sem aba
       * conhecida, e quem barra é a régua de recusa, com uma mensagem melhor do
       * que qualquer coisa que se pudesse escrever aqui. Sobra para este `catch`
       * a leitura do arquivo em si falhar, por exemplo ele sumir do disco no meio.
       */
      setErro(
        causa instanceof Error && causa.message
          ? `Não consegui abrir o arquivo: ${causa.message}`
          : 'Não consegui abrir o arquivo. Confira se é um .xlsx e se ele abre no Excel.',
      );
      setEstado('falhou');
    }
  }, []);

  const limpar = useCallback(() => {
    setEstado('vazio');
    setAnalise(null);
    setErro(null);
  }, []);

  return { estado, analise, erro, analisar, limpar };
}
