import { useMemo, useState } from 'react';
import { FileSignature, MousePointerClick, Sparkles } from 'lucide-react';

import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import {
  AcordoGrupoModal, type ValoresDoAcordo,
} from '@/components/equipe/osg/governanca/AcordoGrupoModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useAcordoDoCliente, useAcordoMutations } from '@/hooks/useDomainAcordoQuotistas';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  GRUPOS_DO_ACORDO, preenchidosNoGrupo, type GrupoDoAcordo,
} from '@/lib/acordoGrupos';
import { resumoDaOrdem, resumoDosQuoruns, resumoDosRamos } from '@/lib/acordoQuotistas';
import type { BaseQuorum, TipoQuorum } from '@/lib/acordoQuotistasPadrao';
import { cn } from '@/lib/utils';

/**
 * Cadastro do Acordo de Quotistas (GOV-03).
 *
 * O acordo é o contrato ENTRE OS SÓCIOS: o contrato social diz quem é dono de
 * quanto e quem manda, e o acordo diz o que acontece quando alguém quer sair,
 * morre, se separa ou quer vender.
 *
 * VEM DEPOIS DA MATRIZ no menu, e isso foi verificado no documento antes de ser
 * decidido: o próprio acordo manda que "composição, eleição e prazos de gestão
 * obedecerão ao que dispor o contrato social", define o quórum PARA ALTERAR o
 * contrato, e tira a área da não concorrência do objeto social dele. Documento
 * que lê três coisas de outro vem depois. Como a Matriz é o que vira as
 * cláusulas de competência do contrato, a ordem é Órgãos, Matriz, Acordo.
 *
 * LISTA DE GRUPOS MAIS MODAL, e não formulário corrido. É o modelo de interface
 * decidido para a governança, e a crítica ao mockup foi exatamente essa. Os oito
 * grupos são os da validação de 11/09 contra o modelo do escritório, com os
 * nomes das cláusulas, porque é o vocabulário de quem preenche.
 *
 * O CADASTRO NASCE SEMEADO. Medido no modelo do escritório: ele marca em ciano o
 * que foi trocado ao adaptar o acordo de um cliente para o do seguinte, 277
 * trechos. Ou seja, o consultor não preenche do zero, ele parte do anterior e
 * muda o que difere. Por isso os sete quóruns e os mecanismos padrão já vêm
 * preenchidos: é o gesto que ele já faz no Word.
 */
const AcordoDeQuotistas = () => {
  const { clienteId } = useOsgWork();
  const { data, isLoading } = useAcordoDoCliente(clienteId);
  const { data: pessoas = [] } = usePessoasByCliente(clienteId ?? null);
  const {
    criarAcordo, salvarAcordo, salvarListas, salvarVinculos,
  } = useAcordoMutations(clienteId);

  const [grupoAberto, setGrupoAberto] = useState<GrupoDoAcordo | null>(null);

  /** O estado do acordo achatado, como os grupos e o modal o leem. */
  const valores: ValoresDoAcordo = useMemo(() => ({
    ...(data?.acordo ?? {}),
    quoruns: (data?.quoruns ?? []).map((q) => ({
      materia: q.materia,
      chave: q.chave,
      tipo: q.tipo as TipoQuorum,
      percentual: q.percentual,
      base: q.base as BaseQuorum,
    })),
    ramos: (data?.ramos ?? []).map((r) => ({
      nome: r.nome, rotulo: r.rotulo as 'ramo' | 'descendentes',
    })),
    ordemPreferencia: (data?.ordemPreferencia ?? []).map((o) => o.quem),
    signatarios: (data?.signatarios ?? []).map((x) => x.pessoa_id),
    sociedades: (data?.sociedades ?? []).map((x) => x.empresa_pessoa_id),
  }), [data]);

  const salvarGrupo = async (novos: ValoresDoAcordo) => {
    if (!data) return;
    const { quoruns, ramos, ordemPreferencia, signatarios, sociedades, ...cabecalho } = novos;

    // As três listas viajam juntas porque a auditoria delas é uma entrada por
    // lista, e não uma por linha. Ver `lib/acordoQuotistas`.
    await salvarListas.mutateAsync({
      acordoId: data.acordo.id,
      versao: data.acordo.versao,
      quoruns,
      ramos,
      ordemPreferencia: ordemPreferencia.filter((q) => q.trim() !== ''),
      antes: {
        quoruns: resumoDosQuoruns(valores.quoruns),
        ramos: resumoDosRamos(valores.ramos),
        ordem: resumoDaOrdem(valores.ordemPreferencia.map((quem, ordem) => ({ quem, ordem }))),
      },
    });

    await salvarVinculos.mutateAsync({
      acordoId: data.acordo.id,
      versao: data.acordo.versao,
      signatarios,
      sociedades,
    });

    await salvarAcordo.mutateAsync({ id: data.acordo.id, campos: cabecalho });
  };

  const salvando = salvarAcordo.isPending || salvarListas.isPending
    || salvarVinculos.isPending;

  return (
    <OsgLayout
      title="Acordo de Quotistas"
      subtitle="O contrato entre os sócios: o que acontece quando alguém quer sair, morre, se separa ou quer vender. O contrato social diz quem é dono e quem manda; o acordo diz o resto."
    >
      <div className="mx-auto max-w-5xl space-y-5">
        {!clienteId ? (
          <Vazio texto="Selecione um cliente na barra acima para abrir o acordo dele." />
        ) : isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 px-6 py-16 text-center">
            <FileSignature className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">Este cliente ainda não tem acordo cadastrado.</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              O acordo nasce com os sete quóruns e os mecanismos mais comuns já preenchidos,
              medidos nos acordos que a OSG já fez. Você corrige o que este cliente tem de
              diferente, em vez de digitar tudo.
            </p>
            <Button
              size="sm"
              className="mt-1"
              disabled={criarAcordo.isPending}
              onClick={() => criarAcordo.mutate()}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Criar o acordo
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-osg-200 bg-osg-50/60 px-4 py-3">
              <p className="text-sm font-semibold text-osg-700">
                Acordo, versão {data.acordo.versao}
              </p>
              <span className="text-xs text-muted-foreground">
                {data.acordo.assinado_em
                  ? `assinado em ${data.acordo.assinado_em}`
                  : 'ainda em minuta'}
              </span>
            </div>

            {/*
              A faixa de instrução, no mesmo molde da Matriz: o que fazer primeiro
              tem de estar visível sem rolar. Ela diz o GESTO, e não repete o que
              o cartão e o subtítulo já dizem.
            */}
            <div className="flex items-start gap-2.5 rounded-xl border border-osg-200 bg-osg-50/60 p-4">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-osg-600" aria-hidden />
              <p className="text-sm text-osg-700">
                <span className="font-semibold">Clique em um bloco para preencher.</span>{' '}
                Os quóruns e os mecanismos mais comuns já vêm respondidos, então percorra
                os blocos e corrija só o que este cliente tem de diferente. Cada campo
                mostra, na ajuda, a frase que o modelo usa e o número que ele traz.
              </p>
            </div>

            {/*
              Os oito grupos como cartões, com o estado de preenchimento. O
              consultor vai ao grupo que este cliente tem de diferente, como vai
              à cláusula pintada no documento que ele adapta.
            */}
            <div className="grid gap-4 sm:grid-cols-2">
              {GRUPOS_DO_ACORDO.map((g) => {
                const { preenchidos, total } = preenchidosNoGrupo(g, valores);
                /*
                 * NÃO EXISTE "PRONTO" AQUI, e a ausência é deliberada.
                 *
                 * Ter todos os campos com valor não quer dizer que alguém olhou:
                 * os quóruns e as regras mais comuns nascem respondidos pela
                 * semente, e o grupo aparecia com o selo de pronto antes de o
                 * analista abrir. Isso convida a pular justamente o bloco que
                 * mais precisa de conferência, porque é o que veio de fora.
                 *
                 * O selo volta quando existir o registro de quem CONFERIU, que é
                 * outra coisa que ter valor. Até lá, a contagem é o que é honesto
                 * dizer: quantos campos têm resposta, de quantos existem.
                 */
                const cheio = preenchidos === total && total > 0;
                return (
                  <div
                    key={g.chave}
                    /*
                      O SPREAD VEM ANTES DO `className`, e a ordem não é gosto.
                      `rowActivateProps` devolve `className: 'cursor-pointer'`, porque
                      nasceu para `<TableRow>`, que não recebe classe de quem chama.
                      Espalhado depois, ele substitui o `className` inteiro e o cartão
                      perde moldura, fundo e espaçamento de uma vez, que foi o que
                      aconteceu na primeira versão desta tela.
                    */
                    {...rowActivateProps(() => setGrupoAberto(g))}
                    className={cn(
                      // `bg-superficie-cartao` é a superfície do OBJETO cartão, tingida.
                      // A outra classe, a do cromo e do controle, difere em duas letras e
                      // significa o oposto; escrevê-la aqui deixaria a caixa branca sobre
                      // página branca. A catraca de `cartaoTingido.test.ts` guarda isso, e
                      // casa o texto do arquivo inteiro, comentário incluído.
                      'cursor-pointer rounded-xl border bg-superficie-cartao p-4',
                      'shadow-sm shadow-osg-300/20 transition-colors',
                      'hover:border-osg-moss hover:bg-osg-50/60 hover:shadow-md',
                      cheio ? 'border-osg-200' : 'border-osg-300/70',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{g.titulo}</p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 tabular-nums',
                          cheio ? 'border-osg-200 bg-osg-50 text-osg-700' : 'text-muted-foreground',
                        )}
                      >
                        {preenchidos} de {total} respondidos
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{g.resumo}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {grupoAberto && (
        <AcordoGrupoModal
          open={!!grupoAberto}
          onOpenChange={(aberto) => !aberto && setGrupoAberto(null)}
          grupo={grupoAberto}
          valores={valores}
          pessoas={pessoas}
          onSalvar={salvarGrupo}
          salvando={salvando}
        />
      )}
    </OsgLayout>
  );
};

const Vazio = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
    <FileSignature className="h-10 w-10 opacity-50" />
    <p className="max-w-md text-sm">{texto}</p>
  </div>
);

export default AcordoDeQuotistas;
