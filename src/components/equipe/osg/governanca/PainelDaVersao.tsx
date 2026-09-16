import { ArrowLeft, Check, ChevronDown, FilePlus2, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { VersaoDoAcordo } from '@/hooks/useDomainAcordoQuotistas';
import { cn } from '@/lib/utils';

/*
 * O painel da versão, na lateral.
 *
 * ELE NASCEU COMO DUAS FAIXAS NO TOPO, e as duas eram ruins. A primeira era uma
 * barra bege com três palavras dentro ("Acordo, versão 1, ainda em minuta"),
 * larga como a tela e vazia. A segunda era a lista de versões, que empurrava os
 * oito blocos para baixo toda vez que se abria: a informação de contexto
 * roubando o lugar do trabalho.
 *
 * Na lateral as duas viram uma coisa só e param de disputar espaço com os
 * blocos. Quem chega vê o estado do acordo sem rolar, e abrir o histórico não
 * mexe em mais nada da página.
 *
 * MESMO PAPEL DO RAIL DA TELA GERAR, que é onde a casa já pôs o histórico de
 * versões; a diferença é que lá ele divide o rail com outros painéis e aqui está
 * sozinho.
 */

/*
 * DATA PURA NÃO PASSA POR `new Date`, e o QA de 15/09 mostrou por quê.
 *
 * `assinado_em` é `date` no banco e chega como "2026-09-15", sem hora. O
 * `new Date("2026-09-15")` lê isso como MEIA-NOITE UTC, e `toLocaleDateString`
 * devolve ao fuso local: em Cuiabá, UTC-4, vira 14/09. Foi medido exatamente
 * assim — gravou 15, mostrou "Assinada em 14/09/26" no painel e no histórico.
 *
 * `created_at` é `timestamptz` e tem hora, então aí o `Date` está certo: o
 * instante é absoluto e a conversão para o fuso local é o que se quer.
 *
 * Mesma regra do `isoParaBR` dos mapeadores, que já resolve isso no motor
 * "sem passar por Date (evita fuso)".
 */
const fmtData = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const soData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1].slice(2)}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/**
 * Data e hora juntas, para a última alteração.
 *
 * A hora entra só aqui, e não na lista de versões: numa lista de datas ela é
 * ruído, mas em "quem mexeu por último e quando" ela é o que responde se o
 * colega ao lado acabou de salvar em cima do que você está vendo.
 */
const fmtDataHora = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

/** A data que representa a versão: quando foi assinada ou, na falta, criada. */
const dataDaVersao = (v: VersaoDoAcordo) => v.assinado_em ?? v.created_at;

interface PainelDaVersaoProps {
  /** A versão aberta agora, que pode não ser a mais nova. */
  versao: number;
  assinadoEm: string | null | undefined;
  atualizadoEm: string | null | undefined;
  atualizadoPor: string | null;
  versoes: VersaoDoAcordo[];
  autores: Record<string, string>;
  /** null = vendo a mais nova, que é a editável. */
  versaoVistaId: string | null;
  onSelecionar: (id: string | null) => void;
  /** Só aparece quando faz sentido criar a próxima; ver a página. */
  podeNovaVersao: boolean;
  criandoVersao: boolean;
  onNovaVersao: () => void;
}

export const PainelDaVersao = ({
  versao, assinadoEm, atualizadoEm, atualizadoPor, versoes, autores,
  versaoVistaId, onSelecionar, podeNovaVersao, criandoVersao, onNovaVersao,
}: PainelDaVersaoProps) => {
  const ehMaisRecente = versaoVistaId === null;
  const numeroAtual = versoes[0]?.versao ?? versao;

  return (
    <div className="space-y-3 rounded-xl border border-osg-300/60 bg-superficie-cartao p-3.5 shadow-sm shadow-osg-300/30">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Acordo de Quotistas
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-lg font-semibold leading-tight text-foreground">
          Versão {versao}
          <span
            className={cn(
              'rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide',
              assinadoEm
                ? 'bg-osg-moss/15 text-osg-700'
                : 'bg-osg-100 text-osg-600',
            )}
          >
            {assinadoEm ? 'assinada' : 'minuta'}
          </span>
        </p>
        {assinadoEm && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Assinada em {fmtData(assinadoEm)}
          </p>
        )}
      </div>

      {/*
        A ÚLTIMA ALTERAÇÃO, com hora. A develop é compartilhada e o cadastro
        também: saber que alguém salvou há dez minutos é diferente de saber que
        a última mexida foi na semana passada.
      */}
      {atualizadoEm && (
        <p className="border-t border-osg-100 pt-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="block text-[10px] font-bold uppercase tracking-wider">
            Última alteração
          </span>
          {fmtDataHora(atualizadoEm)}
          {atualizadoPor ? <span className="block">por {atualizadoPor}</span> : null}
        </p>
      )}

      {!ehMaisRecente && (
        <Button
          size="sm"
          variant="outline"
          className="w-full border-osg-moss/40 text-osg-700 hover:bg-osg-moss/10"
          onClick={() => onSelecionar(null)}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Voltar à versão {numeroAtual}
        </Button>
      )}

      {podeNovaVersao && (
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          disabled={criandoVersao}
          onClick={onNovaVersao}
        >
          <FilePlus2 className="mr-1.5 h-3.5 w-3.5" /> Nova versão
        </Button>
      )}

      {/*
        O histórico só existe com o que escolher. Com uma versão só, a lista
        repetiria o cabeçalho logo acima.
      */}
      {versoes.length > 1 && (
        <Historico
          versoes={versoes}
          autores={autores}
          versaoVistaId={versaoVistaId}
          onSelecionar={onSelecionar}
        />
      )}
    </div>
  );
};

function Historico({
  versoes, autores, versaoVistaId, onSelecionar,
}: {
  versoes: VersaoDoAcordo[];
  autores: Record<string, string>;
  versaoVistaId: string | null;
  onSelecionar: (id: string | null) => void;
}) {
  const atual = versoes[0];

  return (
    <Collapsible defaultOpen className="border-t border-osg-100 pt-2">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="group flex w-full items-center gap-1.5 rounded py-1 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-osg-700"
        >
          <History className="h-3.5 w-3.5 text-osg-moss" />
          <span className="flex-1">
            {versoes.length} versões
          </span>
          {/*
            A seta gira, e o painel abre com altura animada. O Collapsible do
            Radix não anima sozinho: sem as classes abaixo ele troca a altura de
            0 para auto num quadro só, que foi como este histórico nasceu.
          */}
          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-0.5 pt-1">
          {versoes.map((v) => {
            const ehAtual = v.id === atual?.id;
            const selecionado = ehAtual ? versaoVistaId === null : versaoVistaId === v.id;
            const autor = autores[v.created_by ?? ''] || null;
            return (
              <button
                key={v.id}
                type="button"
                aria-pressed={selecionado}
                onClick={() => onSelecionar(ehAtual ? null : v.id)}
                className={cn(
                  'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left transition-colors',
                  selecionado
                    ? 'bg-osg-moss/10 text-osg-700'
                    : 'text-muted-foreground hover:bg-osg-50 hover:text-foreground',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    Versão {v.versao}
                    {ehAtual && (
                      <span className="rounded-full bg-osg-moss/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-osg-700">
                        atual
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {v.assinado_em ? 'assinada' : 'minuta'}
                    {fmtData(dataDaVersao(v)) ? ` · ${fmtData(dataDaVersao(v))}` : ''}
                    {autor ? ` · ${autor}` : ''}
                  </span>
                </span>
                {selecionado && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-moss" />}
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FaixaDaVersaoProps {
  numero: number;
  numeroAtual: number;
  assinadoEm: string | null | undefined;
  ehMaisRecente: boolean;
}

/*
 * O QUE CONGELA UMA VERSÃO É A ASSINATURA, E NÃO A IDADE.
 *
 * A primeira versão desta tela travava toda versão anterior, com o argumento de
 * que ela é "o que os sócios combinaram naquele dia". O argumento não se
 * sustenta: o que vale é o documento ASSINADO, e enquanto ele não existe o
 * cadastro é minuta. Erro de preenchimento costuma aparecer só quando se gera o
 * documento e se lê a cláusula, e travar a minuta obrigaria a refazer a versão
 * inteira para corrigir uma palavra.
 *
 * O PRECEDENTE ESTÁ NA TELA GERAR, e é exatamente este: `ehHead: row.status ===
 * 'rascunho'` (`useDocumentoGerado`). Lá a versão editável é a que está em
 * rascunho, não a mais nova; uma versão selada é que fica em leitura. Aqui o
 * equivalente de selada é `assinado_em` preenchido.
 *
 * O botão de voltar mora no painel lateral, e não aqui: ele é navegação, e
 * navegação tem lugar fixo. Esta faixa só explica.
 */
export const FaixaDaVersao = ({
  numero, numeroAtual, assinadoEm, ehMaisRecente,
}: FaixaDaVersaoProps) => {
  const congelada = !!assinadoEm;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-osg-moss/30 bg-osg-moss/[0.07] p-4">
      <History className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" aria-hidden />
      <p className="text-sm text-osg-700">
        <span className="font-semibold">
          {congelada
            ? `A versão ${numero} foi assinada, então não se edita mais.`
            : `Você está na versão ${numero}, que não é a mais nova.`}
        </span>{' '}
        {congelada
          ? 'O cadastro tem de continuar batendo com o papel: corrigir aqui seria o cadastro '
            + 'mentindo sobre o que foi assinado. Para mudar uma decisão, crie a versão seguinte.'
          : 'Ainda é minuta, então dá para corrigir. Erro de preenchimento costuma aparecer só '
            + 'ao gerar o documento e ler a cláusula.'}
        {!ehMaisRecente && !congelada && ` A mais nova é a ${numeroAtual}.`}
      </p>
    </div>
  );
};
