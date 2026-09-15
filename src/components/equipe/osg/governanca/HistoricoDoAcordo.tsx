import { ArrowLeft, Check, ChevronDown, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { VersaoDoAcordo } from '@/hooks/useDomainAcordoQuotistas';
import { cn } from '@/lib/utils';

/*
 * O histórico de versões do Acordo de Quotistas.
 *
 * MESMO DESENHO DA TELA GERAR (`gerar/HistoricoVersoes`), que é onde a casa já
 * resolveu isto: lista recolhível com a mais nova no topo, etiqueta "atual" na
 * head, data e autor em cada linha, e a versão antiga abrindo em SOMENTE
 * LEITURA com uma faixa avisando. Duas telas que fazem a mesma coisa de dois
 * jeitos é o que faz a pessoa ter de reaprender a ferramenta a cada aba.
 *
 * O que muda em relação ao Gerar: lá a versão antiga oferece "baixar .docx",
 * porque o que se congela é um documento. Aqui o que se congela é um CADASTRO,
 * então o que faz sentido oferecer é voltar à atual. Baixar viria do Gerar, se
 * um dia o acordo tiver modelo.
 */

const fmtData = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

/** A data que representa a versão: quando o acordo foi assinado ou, na falta, criada. */
const dataDaVersao = (v: VersaoDoAcordo) => v.assinado_em ?? v.created_at;

interface HistoricoDoAcordoProps {
  versoes: VersaoDoAcordo[];
  autores: Record<string, string>;
  /** Versão sob visualização; null = vendo a atual, que é a editável. */
  versaoVistaId: string | null;
  onSelecionar: (id: string | null) => void;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}

export const HistoricoDoAcordo = ({
  versoes,
  autores,
  versaoVistaId,
  onSelecionar,
  aberto,
  onAbertoChange,
}: HistoricoDoAcordoProps) => {
  const atual = versoes[0];
  const vendo = versaoVistaId ? versoes.find((v) => v.id === versaoVistaId) : null;
  const resumo = vendo
    ? `Vendo a versão ${vendo.versao}`
    : `${versoes.length} ${versoes.length === 1 ? 'versão' : 'versões'}`;

  return (
    <Collapsible open={aberto} onOpenChange={onAbertoChange}>
      <div className="rounded-md border border-osg-300/60 bg-superficie-cartao shadow-sm shadow-osg-300/30">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
            <History className="h-4 w-4 shrink-0 text-osg-moss" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Histórico de versões
              </span>
              <span className="block truncate text-xs font-semibold text-foreground">{resumo}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                aberto && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 border-t border-osg-100 p-1.5">
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
                  'flex w-full items-start gap-2 rounded px-2.5 py-2 text-left transition-colors',
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
                    {v.assinado_em ? 'assinada' : 'em minuta'}
                    {fmtData(dataDaVersao(v)) ? ` · ${fmtData(dataDaVersao(v))}` : ''}
                    {autor ? ` · ${autor}` : ''}
                  </span>
                </span>
                {selecionado && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-moss" />}
              </button>
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface FaixaDaVersaoProps {
  numero: number;
  numeroAtual: number;
  /** A data em `assinado_em`; nula quando a versão ainda é minuta. */
  assinadoEm: string | null | undefined;
  /** Está vendo a versão mais nova? Então não há para onde voltar. */
  ehMaisRecente: boolean;
  onVoltar: () => void;
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
 * A consequência vale também para a versão mais nova: preenchida a data de
 * assinatura, ela congela, e mudar de ideia passa a ser criar a versão
 * seguinte. É o que o documento assinado impõe.
 */
export const FaixaDaVersao = ({
  numero, numeroAtual, assinadoEm, ehMaisRecente, onVoltar,
}: FaixaDaVersaoProps) => {
  const congelada = !!assinadoEm;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-osg-moss/30 bg-osg-moss/[0.07] px-4 py-2.5">
      <History className="h-4 w-4 shrink-0 text-osg-moss" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-osg-700">
          Vendo a versão {numero}
          <span className="font-normal text-osg-600">
            {congelada ? ' · assinada, somente leitura' : ' · minuta, ainda dá para corrigir'}
          </span>
        </p>
        <p className="text-xs text-osg-600/80">
          {congelada
            ? `Assinada em ${fmtData(assinadoEm)}. O cadastro tem de continuar batendo com o `
              + 'papel, então a correção aqui seria o cadastro mentindo sobre o que foi '
              + 'assinado. Para mudar uma decisão, crie a versão seguinte.'
            : 'Ainda não foi assinada, então o que está aqui é minuta e pode ser corrigido. '
              + 'Erro de preenchimento costuma aparecer só ao gerar o documento e ler a '
              + 'cláusula.'}
        </p>
      </div>
      {!ehMaisRecente && (
        <Button size="sm" className="shrink-0 bg-osg-600 hover:bg-osg-700" onClick={onVoltar}>
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Voltar à versão {numeroAtual}
        </Button>
      )}
    </div>
  );
};
