import { Fragment, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Braces,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  Layers,
  Pencil,
  Power,
  Repeat2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extrairCampos, extrairRunsLinha, removerMarcas, type TipoBloco } from '@/lib/templates';
import { compilar, type No } from '@/lib/templates/render';
import { PAPEIS_LISTA } from '@/lib/templates/binding';
import type { BlocoComVersao } from '@/hooks/useBibliotecaModelos';

// Prefixo do tipo no nome ("Capítulo — …") é redundante dentro do grupo — só na exibição.
const PREFIXO_TIPO: Partial<Record<TipoBloco, RegExp>> = {
  capitulo: /^cap[ií]tulo\s*[—–:-]\s*/i,
  clausula: /^cl[aá]usula\s*[—–:-]\s*/i,
  paragrafo: /^par[aá]grafo\s*[—–:-]\s*/i,
};

const nomeExibido = (nome: string, tipo: TipoBloco) => {
  const semPrefixo = PREFIXO_TIPO[tipo] ? nome.replace(PREFIXO_TIPO[tipo]!, '') : nome;
  return semPrefixo.trim() || nome;
};

// Resumo de uma linha para a ficha: o texto do bloco lido como prosa — campos
// viram lacunas de formulário e seções somem. Usado só quando o autor não
// escreveu uma descrição.
const resumoConteudo = (conteudo: string) =>
  removerMarcas(conteudo)
    .replace(/\{\{\s*[#/][^}]*\}\}/g, ' ')
    .replace(/\{\{[^}]*\}\}/g, '____')
    .replace(/\s+/g, ' ')
    .trim();

// --- Folha de prévia (hover) -------------------------------------------------

/** Texto de um nó com as marcas *_~ aplicadas de verdade (como sairá no .docx). */
const TextoComMarcas = ({ texto }: { texto: string }) => (
  <>
    {texto.split('\n').map((linha, i) => (
      <Fragment key={i}>
        {i > 0 && '\n'}
        {extrairRunsLinha(linha).map((r, j) =>
          r.negrito || r.italico || r.sublinhado ? (
            <span
              key={j}
              className={cn(r.negrito && 'font-semibold', r.italico && 'italic', r.sublinhado && 'underline')}
            >
              {r.texto}
            </span>
          ) : (
            <Fragment key={j}>{r.texto}</Fragment>
          ),
        )}
      </Fragment>
    ))}
  </>
);

const ChipCampo = ({ caminho }: { caminho: string }) => (
  <span className="mx-[1px] inline-flex items-center rounded bg-osg-100 px-1.5 py-px align-baseline font-sans text-[0.8em] font-medium leading-snug text-osg-700 ring-1 ring-osg-200/70 whitespace-nowrap">
    {caminho}
  </span>
);

const ChipSecao = ({ nome }: { nome: string }) => (
  <span className="mx-[1px] inline-flex items-center gap-1 rounded border border-dashed border-osg-300 bg-osg-50 px-1.5 py-px align-baseline font-sans text-[0.8em] font-medium leading-snug text-osg-600 whitespace-nowrap">
    <Repeat2 className="h-3 w-3" />
    {nome}
  </span>
);

const renderNos = (nos: No[]): ReactNode =>
  nos.map((no, i) => {
    if (no.tipo === 'texto') return <TextoComMarcas key={i} texto={no.texto} />;
    if (no.tipo === 'placeholder') return <ChipCampo key={i} caminho={no.caminho} />;
    return (
      <Fragment key={i}>
        <ChipSecao nome={no.nome} />
        {renderNos(no.filhos)}
      </Fragment>
    );
  });

/** Identificação da carta da frente quando a ficha é um deck de variantes. */
interface LegendaVariante {
  rotulo: string;
  posicao: number;
  total: number;
}

/**
 * A prévia é uma "folha de contrato": papel branco, serifa, formatação real e
 * campos como chips. Toda a informação técnica da ficha (campos, flags, versão)
 * mora no rodapé desta folha — fora da visão inicial da biblioteca.
 */
const FolhaPreview = ({
  bloco,
  nomeDaFlag,
  legenda,
}: {
  bloco: BlocoComVersao;
  nomeDaFlag: Map<string, string>;
  legenda?: LegendaVariante;
}) => {
  const conteudo = bloco.versao_atual?.conteudo ?? '';
  const nos = useMemo(() => compilar(conteudo, { tolerante: true }), [conteudo]);
  const campos = useMemo(() => extrairCampos(conteudo), [conteudo]);

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-osg-100 px-4 py-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-osg-600">
          <FileText className="h-3 w-3 shrink-0" />
          Prévia do texto
          {legenda && (
            <span className="truncate font-medium normal-case tracking-normal text-osg-700">
              · {legenda.rotulo}
            </span>
          )}
        </span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {legenda && `${legenda.posicao} de ${legenda.total} · `}
          v{bloco.versao_atual?.numero_versao ?? '—'}
        </span>
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        {conteudo ? (
          <div className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-osg-700">
            {renderNos(nos)}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            {legenda ? 'esta variante ainda não tem versão publicada' : 'sem conteúdo'}
          </p>
        )}
      </div>
      {(campos.length > 0 || bloco.flag_ids.length > 0) && (
        <div className="flex flex-wrap items-center gap-1 border-t border-osg-100 bg-osg-50/60 px-4 py-2">
          {campos.length > 0 && (
            <>
              <Braces className="h-3 w-3 text-osg-600" />
              {campos.map((c) => (
                <code key={c} className="rounded bg-osg-100/80 px-1 py-0.5 text-[10px] text-osg-700">
                  {c}
                </code>
              ))}
            </>
          )}
          {bloco.flag_ids.map((id) => (
            <Badge key={id} className="ml-auto gap-1 bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100 first:ml-0">
              <Flag className="h-2.5 w-2.5" />
              {nomeDaFlag.get(id) ?? '…'}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Deck de variantes ----------------------------------------------------------

/** Seletor jsonb como pares legíveis. Lista vazia = variante padrão (atende qualquer caso). */
const condicoesDoSeletor = (seletor: Record<string, unknown> | null) =>
  Object.entries(seletor ?? {}).map(([caminho, valor]) => ({
    caminho,
    valor: valor !== null && typeof valor === 'object' ? JSON.stringify(valor) : String(valor),
  }));

/** Cartas de trás do deck: a mesma carta, deslocada. No máximo duas, a pilha só precisa se anunciar. */
const CartasDeTras = ({ quantidade, delay }: { quantidade: number; delay: number }) => (
  <>
    {Array.from({ length: Math.min(quantidade, 2) }, (_, i) => (
      <span
        key={i}
        aria-hidden
        className="absolute inset-0 rounded-md border border-osg-300/60 bg-card shadow-sm shadow-osg-300/30 animate-osg-card-in"
        style={{ transform: `translate(${(i + 1) * 4}px, ${(i + 1) * 4}px)`, animationDelay: `${delay}ms` }}
      />
    ))}
  </>
);

/** Fita de navegação da pilha: rótulo do caso, posição e setas. */
const FitaVariante = ({
  rotulo,
  posicao,
  total,
  onAnterior,
  onProximo,
}: {
  rotulo: string;
  posicao: number;
  total: number;
  onAnterior: () => void;
  onProximo: () => void;
}) => (
  <div className="flex items-center gap-0.5 rounded border border-osg-200/70 bg-osg-50/70 px-0.5 py-0.5">
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 hover:bg-osg-100"
      title="Variante anterior"
      aria-label="Variante anterior"
      onClick={(e) => {
        e.stopPropagation();
        onAnterior();
      }}
    >
      <ChevronLeft className="h-3.5 w-3.5 text-osg-600" />
    </Button>
    <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-osg-700">{rotulo}</span>
    <span className="shrink-0 px-1 text-[10px] tabular-nums text-muted-foreground">
      {posicao} de {total}
    </span>
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0 hover:bg-osg-100"
      title="Próxima variante"
      aria-label="Próxima variante"
      onClick={(e) => {
        e.stopPropagation();
        onProximo();
      }}
    >
      <ChevronRight className="h-3.5 w-3.5 text-osg-600" />
    </Button>
  </div>
);

// --- Ficha (card compacto) -----------------------------------------------------

interface FichaBlocoProps {
  bloco: BlocoComVersao;
  tipo: TipoBloco;
  nomeDaFlag: Map<string, string>;
  delay: number;
  /** Variante que o deck deve mostrar de saída (casada pela busca ou apontada por deep-link). */
  varianteDestaqueId?: string;
  onEditar: () => void;
  onToggleAtivo: () => void;
}

export const FichaBloco = ({
  bloco: b,
  tipo,
  nomeDaFlag,
  delay,
  varianteDestaqueId,
  onEditar,
  onToggleAtivo,
}: FichaBlocoProps) => {
  const variantes = b.variantes ?? [];
  // Cabeça de família só se sabe cabeça por ter membros: família sem variante
  // cadastrada é um bloco normal, e a ficha continua a de sempre.
  const ehDeck = variantes.length > 0;

  // -1 é "ninguém apontou variante", que NÃO é a mesma coisa que apontar a
  // primeira: sem essa distinção, apagar a busca jogaria fora a navegação manual.
  const indiceDestaque = varianteDestaqueId ? variantes.findIndex((v) => v.id === varianteDestaqueId) : -1;
  const [indice, setIndice] = useState(Math.max(indiceDestaque, 0));
  // Quando a busca (ou um deep-link) aponta uma variante, o deck salta para ela:
  // carta da frente sem o termo procurado é resultado que não se explica.
  useEffect(() => {
    if (indiceDestaque >= 0) setIndice(indiceDestaque);
  }, [indiceDestaque]);

  // A lista pode encurtar entre renders (outra aba mexeu na família), então a
  // posição é derivada, não confiada ao estado.
  const posicao = ehDeck ? Math.min(indice, variantes.length - 1) : 0;
  const variante = ehDeck ? variantes[posicao] : null;
  // Quem olha o deck está lendo a variante da frente: resumo e prévia vêm dela.
  const exibido = variante ?? b;

  const ciclar = (passo: number) => setIndice((variantes.length + posicao + passo) % variantes.length);

  const resumo = exibido.descricao?.trim() || resumoConteudo(exibido.versao_atual?.conteudo ?? '');
  const condicoes = variante ? condicoesDoSeletor(variante.variante_seletor) : [];
  // No deck o resumo é da variante, então a descrição da cabeça (que explica a
  // família inteira) ganha linha própria em vez de sumir.
  const descricaoDaFamilia = ehDeck ? b.descricao?.trim() : '';
  // Variante desativada não pode passar por carta igual às outras: o que está na
  // frente é o que vale para quem lê.
  const inativoNaFrente = !!variante && !variante.ativo;
  // Sinal no nível da família: a pendência não pode depender de qual carta está
  // na frente, senão o recorte "Inativos" mostra uma carta igual a uma saudável.
  const variantesInativas = variantes.filter((v) => !v.ativo);
  const legenda: LegendaVariante | undefined = variante
    ? {
        rotulo: variante.variante_rotulo?.trim() || 'variante sem rótulo',
        posicao: posicao + 1,
        total: variantes.length,
      }
    : undefined;

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Enter/Espaço com foco num botão interno (setas, ativar/desativar) é
      // ativação daquele botão: sem esta guarda o preventDefault daqui mataria o
      // clique nativo e abriria o editor no lugar de ciclar/desativar.
      if (e.target !== e.currentTarget) return;
      e.preventDefault();
      onEditar();
      return;
    }
    // Setas não ativam botão nenhum, então valem com o foco em qualquer lugar da carta.
    if (!ehDeck) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      ciclar(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ciclar(-1);
    }
  };

  const carta = (
    <div
      role="button"
      tabIndex={0}
      onClick={onEditar}
      onKeyDown={aoTeclar}
      className={cn(
        // Padrão de card OSG: borda marrom-areia atenuada + sombra tonal.
        'group relative flex cursor-pointer flex-col gap-1.5 rounded-md border border-osg-300/60 bg-card p-3.5 pl-4 shadow-sm shadow-osg-300/30 animate-osg-card-in',
        'transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:border-osg-300 hover:shadow-md hover:shadow-osg-300/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/50',
        (!b.ativo || inativoNaFrente) && 'opacity-55',
        // No deck a carta da frente é filha do embrulho: sem isso ela fica mais
        // baixa que as cartas de trás quando outro card estica a linha da grade.
        ehDeck && 'h-full',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span aria-hidden className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-r-full bg-osg-moss" />
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm font-semibold leading-snug">{nomeExibido(b.nome, tipo)}</p>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Pencil aria-hidden className="h-3.5 w-3.5 self-center text-osg-600/70" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={b.ativo ? 'Desativar' : 'Ativar'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleAtivo();
            }}
          >
            <Power className={cn('h-3.5 w-3.5', b.ativo ? 'text-osg-600' : 'text-muted-foreground')} />
          </Button>
        </div>
      </div>
      {descricaoDaFamilia && (
        <p className="line-clamp-1 text-xs leading-relaxed text-osg-600" title={descricaoDaFamilia}>
          {descricaoDaFamilia}
        </p>
      )}
      {legenda && (
        <FitaVariante
          rotulo={legenda.rotulo}
          posicao={legenda.posicao}
          total={legenda.total}
          onAnterior={() => ciclar(-1)}
          onProximo={() => ciclar(1)}
        />
      )}
      {resumo ? (
        <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">{resumo}</p>
      ) : (
        ehDeck && (
          <p className="text-xs italic leading-relaxed text-muted-foreground">
            esta variante ainda não tem versão publicada
          </p>
        )
      )}
      {ehDeck && (
        <div className="flex flex-wrap items-center gap-1">
          {condicoes.length > 0 ? (
            condicoes.map(({ caminho, valor }) => (
              <span
                key={caminho}
                className="inline-flex items-center gap-1 rounded bg-osg-100 px-1.5 py-px text-[10px] text-osg-700 ring-1 ring-osg-200/70"
                title={`Escolhida quando ${caminho} = ${valor}`}
              >
                <code className="font-medium">{caminho}</code>
                <span className="text-osg-600">{valor}</span>
              </span>
            ))
          ) : (
            <span
              className="inline-flex items-center rounded border border-dashed border-osg-300 bg-osg-50 px-1.5 py-px text-[10px] font-medium text-osg-600"
              title="Sem condições: é a redação usada quando nenhuma outra variante casa"
            >
              variante padrão
            </span>
          )}
        </div>
      )}
      {(b.flag_ids.length > 0 || !b.ativo || inativoNaFrente || b.repete_colecao || ehDeck) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {ehDeck && (
            <span
              className="inline-flex items-center gap-1 rounded bg-osg-100 px-1.5 py-px text-[10px] font-medium text-osg-700"
              title="Na geração, o engine escolhe uma destas redações por item"
            >
              <Layers className="h-2.5 w-2.5" />
              {variantes.length} variantes
            </span>
          )}
          {variantesInativas.length > 0 && (
            <span
              className="inline-flex items-center rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800"
              title={`Redações desativadas nesta família: ${variantesInativas
                .map((v) => v.variante_rotulo?.trim() || 'sem rótulo')
                .join(', ')}`}
            >
              {variantesInativas.length} de {variantes.length} inativas
            </span>
          )}
          {b.repete_colecao && (
            <span
              className="inline-flex items-center gap-1 rounded bg-osg-moss/10 px-1.5 py-px text-[10px] font-medium text-osg-moss"
              title={`Na geração, vira um parágrafo por item de: ${PAPEIS_LISTA[b.repete_colecao]?.label ?? b.repete_colecao}`}
            >
              <Repeat2 className="h-2.5 w-2.5" />
              {b.repete_colecao}
            </span>
          )}
          {b.flag_ids.length > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-px text-[10px] font-medium text-amber-800"
              title={b.flag_ids.map((id) => nomeDaFlag.get(id) ?? '…').join(', ')}
            >
              <Flag className="h-2.5 w-2.5" />
              {b.flag_ids.length}
            </span>
          )}
          {!b.ativo && (
            <Badge variant="outline" className="text-[10px]">
              inativo
            </Badge>
          )}
          {inativoNaFrente && (
            <Badge variant="outline" className="text-[10px]" title="Esta redação está desativada">
              variante inativa
            </Badge>
          )}
        </div>
      )}
    </div>
  );

  return (
    <HoverCard openDelay={400} closeDelay={80}>
      <HoverCardTrigger asChild>
        {ehDeck ? (
          <div className="relative">
            <CartasDeTras quantidade={variantes.length - 1} delay={delay} />
            {carta}
          </div>
        ) : (
          carta
        )}
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-[26rem] max-w-[90vw] overflow-hidden border-osg-300/70 p-0 shadow-xl shadow-osg-300/30"
      >
        <FolhaPreview bloco={exibido} nomeDaFlag={nomeDaFlag} legenda={legenda} />
      </HoverCardContent>
    </HoverCard>
  );
};
