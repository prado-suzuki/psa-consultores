import { useState } from 'react';
import { FolderArchive, Loader2, Presentation } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useGerarApresentacao, type DeckTipo } from '@/hooks/useGerarApresentacao';
import {
  useContagemDeSlides,
  SLIDES_DO_TRIBUTARIO,
} from '@/components/equipe/osg/relatorios/useContagemDeSlides';
import { EscolhaDaRevisao } from '@/components/equipe/osg/relatorios/EscolhaDaRevisao';
import { useRevisaoParaSlides } from '@/components/equipe/osg/relatorios/useRevisaoParaSlides';
import { useGerarApresentacaoTributaria } from '@/hooks/useDomainPapelDeTrabalho';
import { baixarArquivoPorUrl } from '@/lib/osg/baixarArquivoPorUrl';
import { toast } from '@/hooks/use-toast';
import { PECAS_COM_DECK, PECAS_DE_SLIDE } from '@/components/equipe/osg/relatorios/catalogoDaBiblioteca';

/**
 * A Biblioteca de Apresentações: escolher e gerar, em segundos.
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
  const { gerar, gerando } = useGerarApresentacao(clienteId ?? '');
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
          : 0;

  /** A peça tem conteúdo para gerar? Os decks pela contagem; o tributário, pela revisão. */
  const temConteudo = (id: string): boolean =>
    id === 'papeis' ? revisao.revisaoId !== null : slidesDaPeca(id) > 0;

  // Começa com tudo marcado: gerar a apresentação inteira é o caso comum.
  const [marcados, setMarcados] = useState<string[]>(PECAS_DE_SLIDE.map((p) => p.id));

  const alternar = (id: string) =>
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  // Peça sem conteúdo não se marca: geraria um .pptx com o molde vazio.
  const geraveis = PECAS_DE_SLIDE.filter((p) => temConteudo(p.id));
  const marcadosValidos = geraveis.filter((p) => marcados.includes(p.id));
  const todos = geraveis.length > 0 && marcadosValidos.length === geraveis.length;
  const totalDeSlides = marcadosValidos.reduce((s, p) => s + slidesDaPeca(p.id), 0);
  const ocupado = gerando !== null || gerarTributaria.isPending;

  /**
   * UM BOTÃO, DUAS FUNÇÕES.
   *
   * Os decks da OSG saem da `gerar-apresentacao`; o tributário, da
   * `gerar-slides-tributarios`, que recebe a revisão escolhida. São arquivos
   * separados e continuam sendo — o que muda é que a pessoa marca tudo e pede
   * uma vez, em vez de caçar dois botões para montar a mesma apresentação.
   */
  const disparar = async () => {
    const decks = marcadosValidos.filter((p) => p.deck !== null).map((p) => p.deck as DeckTipo);
    const comTributaria = marcadosValidos.some((p) => p.id === 'papeis');

    if (decks.length > 0) {
      // `ambas` não é um terceiro deck: é o atalho do servidor para o conjunto.
      await gerar(decks.length === PECAS_COM_DECK.length ? 'ambas' : decks[0]);
    }

    if (comTributaria && revisao.revisaoId) {
      try {
        const r = await gerarTributaria.mutateAsync(revisao.revisaoId);
        if (r.url) await baixarArquivoPorUrl(r.url, r.nomeArquivo);
        toast({
          title: `Papéis de Trabalho: apresentação ${r.versao} gerada`,
          description: r.problemas.length
            ? `O arquivo baixou. Há ${r.problemas.length} ponto(s) para ajustar no PowerPoint.`
            : 'O arquivo baixou.',
        });
      } catch (e) {
        toast({
          title: 'Não consegui gerar os slides do planejamento tributário',
          description: e instanceof Error ? e.message : 'Tente de novo.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.bibliotecaApresentacoes.label}
      subtitle={TELAS_OSG_WORK.bibliotecaApresentacoes.descricao}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <FolderArchive className="h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para gerar a apresentação.</p>
          </div>
        ) : (
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
                const vazio = !temConteudo(peca.id);

                return (
                  <div key={peca.id} className="flex items-center gap-3 border-b border-osg-100 px-4 py-2.5">
                    <Checkbox
                      checked={marcados.includes(peca.id) && !vazio}
                      disabled={vazio || ocupado}
                      onCheckedChange={() => alternar(peca.id)}
                      aria-label={peca.nome}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-sm', vazio ? 'text-muted-foreground' : 'text-foreground')}>
                        {peca.nome}
                      </span>
                      {/* Onde as outras dizem de ONDE vêm os dados, esta diz
                          QUAL revisão vai — que é a escolha que ela tem. */}
                      {tributaria ? (
                        <EscolhaDaRevisao estado={revisao} />
                      ) : (
                        <span className="block truncate text-[11px] text-muted-foreground">{peca.origem}</span>
                      )}
                    </span>

                    <span className={cn('shrink-0 text-sm tabular-nums', vazio ? 'text-muted-foreground' : 'font-semibold text-osg-700')}>
                      {(tributaria ? revisao.carregando : contagem.carregando)
                        ? '…'
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
                    : `${marcadosValidos.length} de ${geraveis.length} · ${totalDeSlides} slide${totalDeSlides === 1 ? '' : 's'}`}
                </span>
                <Button size="sm" onClick={() => void disparar()} disabled={marcadosValidos.length === 0 || ocupado}>
                  {ocupado ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Presentation className="mr-2 h-4 w-4" />
                  )}
                  {ocupado ? 'Gerando…' : 'Gerar apresentação'}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Cada peça marcada baixa o .pptx dela. O histórico dos arquivos do planejamento
              tributário fica no Gerador de Slides, no Digital Dev.
            </p>
          </>
        )}
      </div>
    </OsgLayout>
  );
};

export default BibliotecaApresentacoes;
