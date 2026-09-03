import { useState } from 'react';
import { AlertTriangle, Blocks, FileSignature, Layers, Loader2, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';
import { apararSegmentos } from '@/lib/templates/proveniencia';
import type { OrigemValor, SegmentoRender, TipoBloco } from '@/lib/templates';

// Tipografia da prévia: serifada, como o contrato impresso — a "folha" branca
// sobre o canvas bege é o artefato final da oficina e o centro da tela.
const FONTE_DOCUMENTO = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

export type EstadoFolha = 'pendente' | 'carregando' | 'erro' | 'pronto';

/** Bloco já composto/numerado/renderizado, com o nome de exibição do catálogo. */
export interface BlocoFolha {
  /** Id da posição no modelo (tmpl_documento_bloco). */
  id: string;
  /** Id do bloco na Biblioteca (tmpl_bloco) — abre a edição; null em bloco órfão. */
  blocoId: string | null;
  nome: string;
  tipo?: TipoBloco;
  conteudo: string;
  /** Segmentos do render estruturado — habilitam os valores clicáveis (proveniência). */
  segmentos?: SegmentoRender[];
  /** Bloco com ajuste (override) só deste documento — ganha selo e realce persistentes. */
  sobrescrito?: boolean;
  /**
   * Variantes de família que escreveram trecho DESTE bloco (uma alínea pode vir da
   * redação urbana e a de baixo da rural): entram no popover como alvos próprios
   * de edição, porque é nelas que o texto está.
   */
  variantes?: Array<{ id: string; nome: string }>;
}

interface FolhaDocumentoProps {
  titulo: string;
  /**
   * Onde o consultor está no fluxo: peça, situação e quantos atos pendentes ela
   * formaliza ("1ª alteração · rascunho · formalizando 2 atos pendentes"). Sem
   * isso, uma peça que formaliza dois atos parece que está concatenando
   * alterações, quando é uma peça só que nunca foi registrada.
   */
  situacao?: string | null;
  estado: EstadoFolha;
  /** O que falta para gerar (estado 'pendente'), em linguagem de usuário. */
  mensagemPendente?: string;
  erro?: string | null;
  blocos?: BlocoFolha[] | null;
  /**
   * Quando informado, clicar num trecho abre o popover com o atalho de edição.
   * `alvoId` vem preenchido quando o alvo é uma variante de família em vez do
   * bloco hospedeiro.
   */
  onEditarBloco?: (bloco: BlocoFolha, alvoId?: string) => void;
  /** Quando informado, valores com proveniência viram clicáveis — abre o cadastro de origem. */
  onClickOrigem?: (origem: OrigemValor) => void;
  /** Filtra quais origens ganham o clique (ex.: só pessoas com cadastro). */
  origemClicavel?: (origem: OrigemValor) => boolean;
}

/**
 * A folha do documento gerado: papel branco com sombra e tipografia serifada,
 * cabeçalho timbrado com o nome do modelo. As ações ficam no rail ao lado
 * (PainelAcoes) — aqui é só o documento.
 */
export const FolhaDocumento = ({
  titulo,
  situacao,
  estado,
  mensagemPendente,
  erro,
  blocos,
  onEditarBloco,
  onClickOrigem,
  origemClicavel,
}: FolhaDocumentoProps) => {
  // Popover de edição aberto sobre um trecho (id da posição no modelo).
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  return (
  <div className="min-w-0">
    {estado === 'pendente' && (
      <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-20 text-center">
        <FileSignature className="mx-auto h-8 w-8 text-osg-300" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">{mensagemPendente}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          O documento aparece aqui assim que os passos acima estiverem completos.
        </p>
      </div>
    )}

    {estado === 'carregando' && (
      <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-osg-300" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          Buscando os dados do cadastro…
        </p>
      </div>
    )}

    {estado === 'erro' && (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
        <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
        <p className="mt-3 text-sm font-semibold text-destructive">
          Algo impediu a geração do documento.
        </p>
        {/* A folha não compõe, e é aqui que saber em que peça se está mais
            importa: o que consertar (e se consertar destrava alguma coisa)
            depende de a peça ser um rascunho ou uma que já foi registrada. */}
        {situacao && <p className="mt-1 text-[11px] font-medium text-osg-600">{situacao}</p>}
        {erro && <code className="mt-2 block text-xs text-muted-foreground">{erro}</code>}
        <p className="mt-2 text-xs text-muted-foreground">
          Confira os dados em "Ajustar dados manualmente" ou o conteúdo do modelo na Montagem.
        </p>
      </div>
    )}

    {estado === 'pronto' && (
      <article className="rounded-sm border border-osg-200/70 bg-white px-7 pb-9 pt-2 shadow-[0_1px_2px_rgba(28,25,23,0.06),0_16px_40px_-20px_rgba(68,52,40,0.35)] animate-osg-card-in motion-reduce:animate-none sm:px-12 sm:pb-12">
        {/* <div>, não <header>: o mapa.css tem um `header{display:flex;...}`
            global que vazaria para cá e desfaria o empilhamento centrado. */}
        <div className="mb-8 text-center">
          {/* Etiqueta rente ao topo da folha; o traço musgo sublinha só "Prévia". */}
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-osg-500">
            <span className="inline-block border-b-2 border-osg-moss pb-1">Prévia</span> do
            documento
          </p>
          <h3
            className="mt-8 text-lg font-semibold text-foreground"
            style={{ fontFamily: FONTE_DOCUMENTO }}
          >
            {titulo}
          </h3>
          {situacao && (
            <p className="mt-2 text-[11px] font-medium text-osg-600">{situacao}</p>
          )}
        </div>
        <div
          className="whitespace-pre-wrap text-justify text-[15px] leading-[1.9] text-stone-800"
          style={{ fontFamily: FONTE_DOCUMENTO }}
        >
          {/* Cada bloco é um trecho próprio: passar o mouse destaca o que ele
              renderiza e a etiqueta diz de qual bloco do modelo o trecho veio;
              clicar abre o popover com o atalho de edição do bloco na Biblioteca.
              O espaçamento reproduz o unirBlocos: parágrafo cola na cláusula
              (a própria quebra de bloco), os demais separam com linha em branco. */}
          {(blocos ?? []).map((bloco, i) => {
            const variantes = bloco.variantes ?? [];
            const editavel = !!onEditarBloco && (!!bloco.blocoId || variantes.length > 0);
            const trecho = (
              <div
                key={bloco.id}
                className={cn(
                  'group/bloco relative -mx-3 rounded-md px-3 transition-colors duration-150',
                  'hover:bg-osg-moss/[0.06] hover:ring-1 hover:ring-inset hover:ring-osg-moss/30',
                  'data-[state=open]:bg-osg-moss/[0.06] data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-osg-moss/30',
                  // Ajuste deste documento: o selo marca o bloco e o realce
                  // terracota (diff por palavra) destaca só o que mudou no texto.
                  editavel && 'cursor-pointer',
                  i > 0 && bloco.tipo !== 'paragrafo' && 'mt-[1.9em]',
                )}
              >
                {bloco.sobrescrito && (
                  <span className="pointer-events-none absolute -top-3 left-2 z-10 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-osg-moss/10 px-2 py-0.5 font-sans text-[10px] font-semibold leading-none text-osg-moss ring-1 ring-inset ring-osg-moss/25">
                    <Pencil className="h-2.5 w-2.5" />
                    Ajustado neste documento
                  </span>
                )}
                {bloco.nome && (
                  <span className="pointer-events-none absolute -top-3 right-2 z-10 hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-osg-moss px-2.5 py-1 font-sans text-[10px] font-semibold leading-none tracking-wide text-white shadow-md group-hover/bloco:inline-flex group-data-[state=open]/bloco:inline-flex">
                    <Blocks className="h-3 w-3" />
                    {bloco.nome}
                  </span>
                )}
                {bloco.segmentos ? (
                  <TextoFormatado
                    segmentos={apararSegmentos(bloco.segmentos)}
                    onClickOrigem={onClickOrigem}
                    origemClicavel={origemClicavel}
                  />
                ) : (
                  <TextoFormatado texto={bloco.conteudo.trim()} />
                )}
              </div>
            );
            if (!editavel) return trecho;
            return (
              <Popover
                key={bloco.id}
                open={popoverAberto === bloco.id}
                onOpenChange={(aberto) => setPopoverAberto(aberto ? bloco.id : null)}
              >
                <PopoverTrigger asChild>{trecho}</PopoverTrigger>
                {/* Um alvo por texto que compõe o trecho: o bloco do modelo e, quando
                    a redação veio de uma família, cada variante que escreveu aqui. */}
                <PopoverContent side="top" align="center" className="w-auto p-1.5">
                  {bloco.blocoId && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-osg-50 hover:text-osg-700"
                      onClick={() => {
                        setPopoverAberto(null);
                        onEditarBloco?.(bloco);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-osg-600" />
                      Editar bloco "{bloco.nome}"
                    </button>
                  )}
                  {variantes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 font-sans text-xs font-medium text-foreground transition-colors hover:bg-osg-50 hover:text-osg-700"
                      onClick={() => {
                        setPopoverAberto(null);
                        onEditarBloco?.(bloco, v.id);
                      }}
                    >
                      <Layers className="h-3.5 w-3.5 text-osg-moss" />
                      Editar a redação "{v.nome}"
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </article>
    )}
  </div>
  );
};
