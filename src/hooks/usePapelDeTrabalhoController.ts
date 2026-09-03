import { useCallback, useState } from 'react';

import { lerWp, type ResultadoLeitura, type ValorWp } from '@/lib/planejamento-tributario/parser';
import { decideImportacao, type Decisao } from '@/lib/planejamento-tributario/recusa';
import { validar } from '@/lib/planejamento-tributario/validacoes';
import { ABA_FAROL, ABA_VENDA_DE_ATIVOS, VERSAO_DO_MAPA } from '@/lib/planejamento-tributario/mapa';

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

/**
 * Um slide da apresentação e o estado da fonte dele.
 *
 * **É esta a pergunta que a tela responde**, e não "quantas células eu li". A
 * contagem crua não era verificável: ninguém sabe se 1.394 valores é o número
 * certo, então ela não cumpria a função de pegar leitura incompleta. "3 cenários em
 * 3 anos" e "9 blocos de comentário" se conferem abrindo a planilha, e slide sem
 * fonte aparece nomeado em vez de escondido atrás de um zero.
 */
export interface SlideLido {
  /** Como o slide se chama na apresentação. */
  slide: string;
  /** De onde ele sai, no vocabulário da planilha. */
  fonte: string;
  temFonte: boolean;
  /** O que foi achado, em termos conferíveis na planilha. */
  detalhe: string;
}

/** Quanto de cada bloco a leitura trouxe, para a tela mostrar sem recontar. */
export interface ResumoDaLeitura {
  valores: number;
  farol: number;
  comentarios: number;
  bens: number;
  dividas: number;
  /** Anos distintos encontrados, em ordem. */
  anos: number[];
  /**
   * As abas que de fato produziram dado, deduzidas do endereço de origem de cada
   * valor.
   *
   * **Não é a lista de cenários, e isso é de propósito.** O WP chama o mesmo
   * cenário por dois nomes: `Cenário 01` no cabeçalho de coluna da aba `Resumo` e
   * `Cenário 01 (PFxPJ)` no nome da aba dele. Mostrar os dois fazia três cenários
   * parecerem sete na tela. Reconciliar os dois vocabulários é decisão da
   * gravação; para conferir a leitura, o que importa é qual aba foi aberta.
   */
  abasLidas: string[];
}

export interface Analise {
  nomeDoArquivo: string;
  tamanho: number;
  versaoDoMapa: string;
  leitura: ResultadoLeitura;
  decisao: Decisao;
  resumo: ResumoDaLeitura;
  slides: SlideLido[];
}

/**
 * De onde sai cada slide, e o que foi achado para ele.
 *
 * A ordem é a da apresentação. Os comentários das notas do Farol não entram na
 * conta das caixas de texto do Resumo, porque acompanham outro slide.
 *
 * **`Imóveis Explorados` não tem tabela no banco**, por decisão do Bernardo em
 * 02/09/2026, e por isso o cartão de hectares aparece sem fonte mesmo quando a
 * planilha traz os imóveis. É melhor a tela dizer isso do que o slide sair vazio
 * sem ninguém saber por quê.
 */
function montaSlides(leitura: ResultadoLeitura): SlideLido[] {
  const contaDe = (bloco: ValorWp['bloco'], filtro?: (v: ValorWp) => boolean) =>
    leitura.valores.filter((v) => v.bloco === bloco && (filtro?.(v) ?? true));

  const distintos = <T>(itens: T[]) => new Set(itens).size;
  const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

  const daVenda = leitura.valores.filter((v) => v.cenario === ABA_VENDA_DE_ATIVOS.nome);
  const daApuracao = contaDe('apuracao', (v) => v.cenario !== ABA_VENDA_DE_ATIVOS.nome);
  const doResumo = contaDe('resumo');
  const daDre = contaDe('dre');
  const doFarol = leitura.farol;
  const caixas = leitura.comentarios.filter((c) => c.cenario !== null);
  const notas = leitura.comentarios.filter((c) => c.cenario === null);

  return [
    {
      slide: 'Premissas, cartões',
      fonte: 'totais de bens, dívidas e imóveis',
      temFonte: leitura.bens.length > 0 || leitura.dividas.length > 0,
      detalhe:
        leitura.bens.length + leitura.dividas.length === 0
          ? 'nenhum bem e nenhuma dívida na planilha'
          : `${plural(leitura.bens.length, 'bem', 'bens')} e ${plural(leitura.dividas.length, 'dívida', 'dívidas')}. O cartão de hectares não tem fonte: a tabela de imóveis ficou fora do escopo`,
    },
    {
      slide: 'Premissas, DRE',
      fonte: 'DRE das abas de cenário',
      temFonte: daDre.length > 0,
      detalhe: daDre.length
        ? `${plural(distintos(daDre.map((v) => v.rotulo)), 'conta', 'contas')} em ${plural(distintos(daDre.map((v) => v.ano)), 'ano', 'anos')}`
        : 'a DRE veio vazia',
    },
    {
      slide: 'Carga Tributária',
      fonte: `aba ${ABA_FAROL.nome}`,
      temFonte: doFarol.length > 0,
      detalhe: doFarol.length
        ? `${plural(distintos(doFarol.map((f) => f.rotulo)), 'linha', 'linhas')} nos quatro regimes`
        : 'o farol veio vazio',
    },
    {
      slide: 'Transferência da Atividade Rural',
      fonte: 'aba de Venda de Ativos',
      temFonte: daVenda.length > 0,
      detalhe: daVenda.length
        ? `${plural(distintos(daVenda.map((v) => v.ano)), 'ano', 'anos')} de apuração`
        : 'a venda de ativos veio vazia',
    },
    {
      slide: 'Resumo da Tributação',
      fonte: 'aba Resumo',
      temFonte: doResumo.length > 0,
      detalhe: doResumo.length
        ? `${plural(distintos(doResumo.map((v) => v.cenario)), 'cenário', 'cenários')} em ${plural(distintos(doResumo.map((v) => v.ano)), 'ano', 'anos')}`
        : 'o resumo veio vazio',
    },
    {
      slide: 'Resumo, caixas de texto',
      fonte: 'comentários das abas de cenário',
      temFonte: caixas.length > 0,
      detalhe: caixas.length
        ? `${plural(distintos(caixas.map((c) => `${c.cenario}|${c.tributo}`)), 'bloco', 'blocos')}, ${plural(caixas.length, 'linha', 'linhas')} de texto`
        : 'nenhum comentário preenchido',
    },
    {
      slide: 'Notas da Carga Tributária',
      fonte: `notas de rodapé da aba ${ABA_FAROL.nome}`,
      temFonte: notas.length > 0,
      detalhe: notas.length ? `${plural(notas.length, 'nota', 'notas')}` : 'sem notas',
    },
    {
      slide: 'Apuração do IRPF, por cenário',
      fonte: 'apuração das abas de cenário',
      temFonte: daApuracao.length > 0,
      detalhe: daApuracao.length
        ? `${plural(distintos(daApuracao.map((v) => v.cenario)), 'cenário', 'cenários')} em ${plural(distintos(daApuracao.map((v) => v.ano)), 'ano', 'anos')}`
        : 'a apuração veio vazia',
    },
  ];
}

/** `Resumo!D16` e `Bens da Atv. Rural!8` viram `Resumo` e `Bens da Atv. Rural`. */
function abaDoEndereco(origem: string): string {
  return origem.split('!')[0];
}

function resume(leitura: ResultadoLeitura): ResumoDaLeitura {
  const abas = new Set<string>();
  for (const v of leitura.valores) abas.add(abaDoEndereco(v.origemCelula));
  for (const f of leitura.farol) abas.add(abaDoEndereco(f.origemCelula));
  for (const c of leitura.comentarios) abas.add(abaDoEndereco(c.origemCelula));
  for (const b of leitura.bens) abas.add(abaDoEndereco(b.origemLinha));
  for (const d of leitura.dividas) abas.add(abaDoEndereco(d.origemLinha));

  return {
    valores: leitura.valores.length,
    farol: leitura.farol.length,
    comentarios: leitura.comentarios.length,
    bens: leitura.bens.length,
    dividas: leitura.dividas.length,
    anos: [...new Set(leitura.valores.map((v) => v.ano))].sort((a, b) => a - b),
    abasLidas: [...abas],
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
        slides: montaSlides(leitura),
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
