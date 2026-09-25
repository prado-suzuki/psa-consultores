import { useState } from 'react';
import { FolderArchive, Loader2, Presentation } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useGerarApresentacao, type DeckDaApresentacao } from '@/hooks/useGerarApresentacao';
import {
  useContagemDeSlides,
  SLIDES_DO_TRIBUTARIO,
} from '@/components/equipe/osg/relatorios/useContagemDeSlides';
import { EscolhaDaRevisao } from '@/components/equipe/osg/relatorios/EscolhaDaRevisao';
import { useRevisaoParaSlides } from '@/components/equipe/osg/relatorios/useRevisaoParaSlides';
import { EscolhaDosCenarios } from '@/components/equipe/osg/relatorios/EscolhaDosCenarios';
import { useCenariosParaSlides } from '@/components/equipe/osg/relatorios/useCenariosParaSlides';
import { useGerarApresentacaoTributaria } from '@/hooks/useDomainPapelDeTrabalho';
import { baixarArquivoPorUrl } from '@/lib/osg/baixarArquivoPorUrl';
import { conferirDecksGerados } from '@/lib/osg/resultadoGeracaoApresentacoes';
import { toast } from '@/hooks/use-toast';
import { PECAS_DE_SLIDE } from '@/components/equipe/osg/relatorios/catalogoDaBiblioteca';
import { EstadoVazio } from '@/components/shared/EstadoVazio';
import {
  PontosParaConferir,
  type OndeCorrige,
  type PontoParaConferir,
} from '@/components/equipe/osg/relatorios/PontosParaConferir';

/** Onde cada aviso se corrige. A `origem` muda de lugar: cadastro na OSG, planilha no tributário. */
const ondeCorrige = (tipo: string, origem: 'Cadastro' | 'Planilha'): OndeCorrige =>
  tipo === 'formatacao' ? 'PowerPoint' : tipo === 'sistema' ? 'Sistema' : origem;

/**
 * Apresentações: escolher e gerar, em segundos.
 *
 * O ARQUIVO CONTINUA `BibliotecaApresentacoes`. A tela passou a se chamar só
 * "Apresentações" em 18/09/2026 — nome interno não acompanha rótulo.
 *
 * ESTA TELA NÃO MOSTRA DADO. Ela mostrou, por várias versões: cada peça abria a
 * tabela inteira que iria para o deck, com resumo, organograma e colunas de
 * validação. Levava minutos para entender o que estava ali, e o trabalho de
 * quem abre é outro — marcar o que vai para a apresentação e gerar. Conferir o
 * conteúdo é trabalho dos módulos de cadastro, que é onde ele se corrige.
 *
 * MARCAR É POR DECK, e não por slide, porque a `gerar-apresentacao` monta o deck
 * inteiro — escolher slide avulso exigiria mexer na função, nos dois templates e
 * criar o cadastro de quais slides existem. A contagem ao lado de cada linha diz
 * quantos vêm, que é o que falta para decidir sem abrir nada.
 */
const BibliotecaApresentacoes = () => {
  const { clienteId } = useOsgWork();
  const cenarios = useCenariosParaSlides(clienteId || null);
  /* As simulações escolhidas vão junto: o capítulo 04 é deck desta mesma função. */
  const gerarDecks = useGerarApresentacao(clienteId ?? null, cenarios.simulacaoIds);
  const contagem = useContagemDeSlides(clienteId || null);
  const revisao = useRevisaoParaSlides(clienteId || null);
  const gerarTributaria = useGerarApresentacaoTributaria();

  const slidesDaPeca = (id: string): number =>
    id === 'dp'
      ? contagem.patrimonial
      : id === 'societario'
        ? contagem.societaria
        : id === 'papeis' && revisao.revisaoId
          ? SLIDES_DO_TRIBUTARIO
          : id === 'sucessoria'
            ? cenarios.slides
            : 0;

  /* A FALHA NÃO SE VESTE DE VAZIO (AP-E01): consulta que quebra não pode ler como
     "Nenhuma simulação aprovada" nem "sem dados" — quem lê aprova ou importa de
     novo. Cada linha diz o que não carregou e oferece tentar de novo. */
  type FalhaDeCarga = 'simulacoes' | 'revisoes' | 'slides';
  const TEXTO_DA_FALHA: Record<FalhaDeCarga, string> = {
    simulacoes: 'Não foi possível carregar as simulações.',
    revisoes: 'Não foi possível carregar as revisões.',
    slides: 'Não foi possível contar os slides.',
  };
  const falhaDeCarga = (id: string): FalhaDeCarga | null =>
    id === 'sucessoria'
      ? cenarios.erro ? 'simulacoes' : null
      : id === 'papeis'
        ? revisao.erro ? 'revisoes' : null
        : contagem.erro ? 'slides' : null;
  const tentarDeNovo = (falha: FalhaDeCarga) => () => {
    if (falha === 'simulacoes') cenarios.tentarDeNovo();
    else if (falha === 'revisoes') revisao.tentarDeNovo();
    else contagem.tentarDeNovo();
  };

  /* AP-E02: HÁ DADO e FALTA A ESCOLHA são estados diferentes. Com simulações
     aprovadas e nenhuma marcada, a linha não some nem lê "sem dados": o nome
     fica em cor de texto, a coluna diz "0" e a caixa trava com o motivo já
     escrito ("Nenhuma simulação marcada."). "sem dados" só sem aprovação nenhuma. */
  const semDadoNaLinha = (id: string): boolean =>
    id === 'sucessoria'
      ? cenarios.opcoes.length === 0
      : !temConteudo(id);
  const semEscolhaDoCenario = (id: string): boolean =>
    id === 'sucessoria' && cenarios.opcoes.length > 0 && cenarios.simulacaoIds.length === 0;

  /** A peça tem conteúdo para gerar? Os decks pela contagem; o tributário, pela revisão;
      o sucessório, pelas simulações aprovadas marcadas. */
  const temConteudo = (id: string): boolean =>
    id === 'papeis'
      ? revisao.revisaoId !== null
      : id === 'sucessoria'
        ? cenarios.simulacaoIds.length > 0
        : slidesDaPeca(id) > 0;

  /* Os pontos da última geração, presos ao cliente em que ela rodou: trocar de
     cliente tira o quadro, e gerar de novo o substitui. */
  const [ultimaGeracao, setUltimaGeracao] = useState<{ clienteId: string; pontos: PontoParaConferir[] } | null>(null);

  // Começa com tudo marcado: gerar a apresentação inteira é o caso comum.
  const [marcados, setMarcados] = useState<string[]>(PECAS_DE_SLIDE.map((p) => p.id));

  const alternar = (id: string) =>
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  /** Por que a peça tem conteúdo e mesmo assim não gera: hoje só o sucessório com UPFs diferentes. */
  const bloqueio = (id: string): string | null => (id === 'sucessoria' ? cenarios.conflitoDeUpf : null);

  // Peça sem conteúdo não se marca: geraria um .pptx com o molde vazio.
  const geraveis = PECAS_DE_SLIDE.filter((p) => temConteudo(p.id) && !bloqueio(p.id));
  const marcadosValidos = geraveis.filter((p) => marcados.includes(p.id));
  const todos = geraveis.length > 0 && marcadosValidos.length === geraveis.length;
  const totalDeSlides = marcadosValidos.reduce((s, p) => s + slidesDaPeca(p.id), 0);
  /* As duas peças respondem pelo mesmo `isPending` desde que a geração da OSG
     virou mutation — antes era um `gerando` caseiro de um lado e React Query do
     outro, para a mesma pergunta. */
  const ocupado = gerarDecks.isPending || gerarTributaria.isPending;

  /**
   * UM BOTÃO, DUAS FUNÇÕES.
   *
   * Os decks da OSG saem da `gerar-apresentacao`; o tributário, da
   * `gerar-slides-tributarios`, que recebe a revisão escolhida. São arquivos
   * separados e continuam sendo — o que muda é que a pessoa marca tudo e pede
   * uma vez, em vez de caçar dois botões para montar a mesma apresentação.
   *
   * E UM AVISO SÓ, NO FIM. Cada geração dava o seu, e com `TOAST_LIMIT = 1` o
   * segundo apagava o primeiro: marcando as três peças, a falha dos dois decks
   * sumia atrás do sucesso do tributário, e a tela ficava dizendo que deu certo
   * com um arquivo de três na mão. Revisão de 18/09/2026.
   */
  const disparar = async () => {
    const decks = marcadosValidos.filter((p) => p.deck !== null).map((p) => p.deck as DeckDaApresentacao);
    const comTributaria = marcadosValidos.some((p) => p.id === 'papeis');

    const gerados: string[] = [];
    const falhas: string[] = [];
    const pontos: PontoParaConferir[] = [];
    setUltimaGeracao(null);

    if (decks.length > 0) {
      // A lista do que foi marcado: com três decks, um `tipo` só mandaria um.
      const r = await gerarDecks.mutateAsync(decks);
      const resultado = conferirDecksGerados(
        marcadosValidos
          .filter((p) => p.deck !== null)
          .map((p) => ({ nome: p.nome, tipo: p.deck })),
        r,
      );
      gerados.push(...resultado.gerados);
      falhas.push(...resultado.falhas);

      /* O que faltou vai para o quadro "Pontos para conferir": nos decks da OSG, `origem` é dado que falta no
         cadastro e `formatacao` é o que não coube. */
      for (const x of r.problemas ?? []) {
        pontos.push({ parte: x.onde, detalhe: x.detalhe, corrige: ondeCorrige(x.tipo, 'Cadastro') });
      }
    }

    if (comTributaria && revisao.revisaoId) {
      try {
        const r = await gerarTributaria.mutateAsync(revisao.revisaoId);
        if (!r.url) {
          falhas.push('Planejamento Tributário: a geração não devolveu um link para baixar o arquivo');
        } else {
          await baixarArquivoPorUrl(r.url, r.nomeArquivo);
          gerados.push(r.nomeArquivo);
        }
        /* No tributário, a origem é a planilha do papel de trabalho, não o cadastro. */
        for (const x of r.problemas) {
          pontos.push({
            parte: `Planejamento Tributário · ${x.onde}`,
            detalhe: x.detalhe,
            corrige: ondeCorrige(x.tipo, 'Planilha'),
          });
        }
      } catch (e) {
        /* A mensagem crua é de máquina e vai para o console; a tela recebe o
           texto fixo, no molde dos decks da OSG (AP-E04). */
        console.error('gerar-slides-tributarios:', e);
        falhas.push('Planejamento Tributário: não foi possível gerar esta apresentação.');
      }
    }

    if (pontos.length > 0 && clienteId) setUltimaGeracao({ clienteId, pontos });
    /* O toast só conta e aponta para o quadro: a lista inteira fica na tela. */
    const avisos = pontos.length === 0
      ? []
      : [`${pontos.length === 1 ? 'Um ponto para conferir, listado' : `${pontos.length} pontos para conferir, listados`} abaixo da tabela.`];

    const quantos = `${gerados.length} de ${marcadosValidos.length}`;
    if (falhas.length === 0) {
      toast({
        title: gerados.length === 1 ? 'Apresentação gerada' : 'Apresentações geradas',
        description: [`Baixados: ${gerados.join(', ')}.`, ...avisos].join(' '),
      });
      return;
    }

    toast({
      title:
        gerados.length === 0
          ? 'Não foi possível gerar as apresentações'
          : `${quantos} apresentações geradas`,
      description: [
        ...(gerados.length ? [`Baixados: ${gerados.join(', ')}.`] : []),
        `Não geradas: ${falhas.join('; ')}.`,
        ...avisos,
        'Entre em contato com o suporte da PSA Digital.',
      ].join(' '),
      variant: 'destructive',
    });
  };

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.bibliotecaApresentacoes.label}
      subtitle={TELAS_OSG_WORK.bibliotecaApresentacoes.descricao}
    >
      {!clienteId ? (
        <EstadoVazio
          titulo="Selecione um cliente na barra acima para abrir as apresentações deste cliente."
          icone={<FolderArchive className="h-10 w-10 text-muted-foreground opacity-50" />}
        />
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <>
            {/* UMA TABELA SÓ, E UM BOTÃO SÓ. Os Papéis de Trabalho tinham caixa
                própria e "Gerar os slides desta revisão" à parte — a tela dizia
                que são coisas diferentes quando são o mesmo modelo de slide, e
                na maioria das vezes saem na mesma apresentação. O que os separa
                de verdade é UM PARÂMETRO, a revisão, e parâmetro cabe num lápis
                na própria linha. */}
            <div className="overflow-hidden rounded-xl border border-osg-200">
              <div className="flex items-center gap-3 border-b border-osg-200 bg-muted/50 px-4 py-2">
                <Checkbox
                  checked={todos}
                  disabled={geraveis.length === 0 || ocupado}
                  onCheckedChange={() => setMarcados(todos ? [] : geraveis.map((p) => p.id))}
                  aria-label="Marcar todas as apresentações"
                />
                <span className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apresentação
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Slides
                </span>
              </div>

              {PECAS_DE_SLIDE.map((peca) => {
                const tributaria = peca.id === 'papeis';
                const sucessoria = peca.id === 'sucessoria';
                const vazio = semDadoNaLinha(peca.id);
                const semEscolha = semEscolhaDoCenario(peca.id);
                const recusa = bloqueio(peca.id);
                const falha = falhaDeCarga(peca.id);

                return (
                  <div key={peca.id} className="flex items-center gap-3 border-b border-osg-100 px-4 py-2.5">
                    <Checkbox
                      checked={marcados.includes(peca.id) && !vazio && !recusa && !falha}
                      disabled={vazio || semEscolha || !!recusa || !!falha || ocupado}
                      onCheckedChange={() => alternar(peca.id)}
                      aria-label={peca.nome}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', vazio ? 'text-muted-foreground' : 'text-foreground')}>
                        {peca.nome}
                      </span>
                      {/* AS DUAS LINHAS, E A REVISÃO EMBAIXO. O seletor ocupava
                          o lugar do subtítulo, e a peça tributária era a única
                          da tabela sem dizer o que entrega — o texto existia no
                          catálogo e não chegava à tela. Ela tem as duas coisas
                          a dizer: o que vai no arquivo, como as outras, e QUAL
                          revisão vai, que é a escolha que só ela tem. */}
                      <span className="block truncate text-[11px] text-muted-foreground">{peca.origem}</span>
                      {falha ? (
                        <span role="alert" className="mt-0.5 flex items-center gap-2 text-[11px] text-destructive">
                          {TEXTO_DA_FALHA[falha]}
                          <Button
                            variant="link"
                            className="h-auto p-0 text-[11px]"
                            onClick={tentarDeNovo(falha)}
                          >
                            Tentar de novo
                          </Button>
                        </span>
                      ) : (
                        <>
                          {tributaria && <EscolhaDaRevisao estado={revisao} />}
                          {sucessoria && <EscolhaDosCenarios estado={cenarios} />}
                        </>
                      )}
                      {recusa && <span role="alert" className="mt-0.5 block text-[11px] text-destructive">{recusa}</span>}
                    </span>

                    <span className={cn('shrink-0 text-sm tabular-nums', vazio ? 'text-muted-foreground' : 'font-semibold text-osg-700')}>
                      {(tributaria ? revisao.carregando : sucessoria ? cenarios.carregando : contagem.carregando)
                        ? '…'
                        : falha
                          ? '—'
                          : vazio
                            ? 'sem dados'
                            : slidesDaPeca(peca.id)}
                    </span>
                  </div>
                );
              })}

              {/* O rodapé é da tabela, e por isso vive DENTRO da borda dela. */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  {marcadosValidos.length === 0
                    ? 'Nada marcado.'
                    : `${marcadosValidos.length} marcada${marcadosValidos.length === 1 ? '' : 's'} · ${totalDeSlides} slide${totalDeSlides === 1 ? '' : 's'}`}
                </span>
                <Button size="sm" onClick={() => void disparar()} disabled={marcadosValidos.length === 0 || ocupado}>
                  {ocupado ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Presentation className="mr-2 h-4 w-4" />
                  )}
                  {/* Plural: marca-se mais de uma peça, e cada uma é um arquivo. */}
                  {ocupado ? 'Gerando…' : 'Gerar apresentações'}
                </Button>
              </div>
            </div>

            {ultimaGeracao?.clienteId === clienteId && <PontosParaConferir pontos={ultimaGeracao.pontos} />}

            <p className="text-xs text-muted-foreground">
              Cada apresentação marcada é baixada num arquivo próprio e fica guardada
              com número de versão. As versões do planejamento tributário ficam no
              Gerador de Slides, no Tax Work.
            </p>
          </>
        </div>
      )}
    </OsgLayout>
  );
};

export default BibliotecaApresentacoes;
