import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Plus,
  Pencil,
  FileText,
  Search,
  Power,
  Loader2,
  Braces,
  Flag,
  BookOpen,
  ScrollText,
  Pilcrow,
  StickyNote,
  FilterX,
  Tag,
  SlidersHorizontal,
  LibraryBig,
  Repeat2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  extrairCampos,
  extrairRunsLinha,
  removerMarcas,
  TIPOS_BLOCO,
  type TipoBloco,
} from '@/lib/templates';
import { compilar, type No } from '@/lib/templates/render';
import { PAPEIS_LISTA } from '@/lib/templates/binding';
import {
  useBlocos,
  useFlags,
  useToggleBlocoAtivo,
  type BlocoComVersao,
} from '@/hooks/useBibliotecaModelos';

// Cabeçalhos dos grupos da listagem (na ordem estrutural de TIPOS_BLOCO).
const GRUPO_POR_TIPO: Record<TipoBloco, { label: string; Icone: typeof BookOpen }> = {
  capitulo: { label: 'Capítulos', Icone: BookOpen },
  clausula: { label: 'Cláusulas', Icone: ScrollText },
  paragrafo: { label: 'Parágrafos', Icone: Pilcrow },
  livre: { label: 'Blocos livres', Icone: StickyNote },
};


type FiltroStatus = 'todos' | 'ativos' | 'inativos';
type Prateleira = 'todos' | TipoBloco;

const PRATELEIRAS: Array<{ valor: Prateleira; label: string; Icone: typeof BookOpen }> = [
  { valor: 'todos', label: 'Tudo', Icone: LibraryBig },
  { valor: 'capitulo', label: 'Capítulos', Icone: BookOpen },
  { valor: 'clausula', label: 'Cláusulas', Icone: ScrollText },
  { valor: 'paragrafo', label: 'Parágrafos', Icone: Pilcrow },
  { valor: 'livre', label: 'Livres', Icone: StickyNote },
];

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

// Categorias são slugs (descricao_imovel) — na tela viram texto de gente.
const nomeCategoria = (categoria: string) => categoria.replace(/_/g, ' ');

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

/**
 * A prévia é uma "folha de contrato": papel branco, serifa, formatação real e
 * campos como chips. Toda a informação técnica da ficha (campos, flags, versão)
 * mora no rodapé desta folha — fora da visão inicial da biblioteca.
 */
const FolhaPreview = ({ bloco, nomeDaFlag }: { bloco: BlocoComVersao; nomeDaFlag: Map<string, string> }) => {
  const conteudo = bloco.versao_atual?.conteudo ?? '';
  const nos = useMemo(() => compilar(conteudo, { tolerante: true }), [conteudo]);
  const campos = useMemo(() => extrairCampos(conteudo), [conteudo]);

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between border-b border-osg-100 px-4 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-osg-600">
          <FileText className="h-3 w-3" />
          Prévia do texto
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          v{bloco.versao_atual?.numero_versao ?? '—'}
        </span>
      </div>
      <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
        {conteudo ? (
          <div className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed text-osg-700">
            {renderNos(nos)}
          </div>
        ) : (
          <p className="text-sm italic text-muted-foreground">sem conteúdo</p>
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

// --- Ficha (card compacto) -----------------------------------------------------

interface FichaBlocoProps {
  bloco: BlocoComVersao;
  tipo: TipoBloco;
  nomeDaFlag: Map<string, string>;
  delay: number;
  onEditar: () => void;
  onToggleAtivo: () => void;
}

const FichaBloco = ({ bloco: b, tipo, nomeDaFlag, delay, onEditar, onToggleAtivo }: FichaBlocoProps) => {
  const resumo = b.descricao?.trim() || resumoConteudo(b.versao_atual?.conteudo ?? '');

  return (
    <HoverCard openDelay={400} closeDelay={80}>
      <HoverCardTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onEditar}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEditar();
            }
          }}
          className={cn(
            // Padrão de card OSG: borda marrom-areia atenuada + sombra tonal.
            'group relative flex cursor-pointer flex-col gap-1.5 rounded-md border border-osg-300/60 bg-card p-3.5 pl-4 shadow-sm shadow-osg-300/30 animate-osg-card-in',
            'transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:border-osg-300 hover:shadow-md hover:shadow-osg-300/40',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/50',
            !b.ativo && 'opacity-55',
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
          {resumo && <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground">{resumo}</p>}
          {(b.flag_ids.length > 0 || !b.ativo || b.repete_colecao) && (
            <div className="flex flex-wrap items-center gap-1.5">
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
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-[26rem] max-w-[90vw] overflow-hidden border-osg-300/70 p-0 shadow-xl shadow-osg-300/30"
      >
        <FolhaPreview bloco={b} nomeDaFlag={nomeDaFlag} />
      </HoverCardContent>
    </HoverCard>
  );
};

// --- Página ---------------------------------------------------------------------

const BibliotecaModelos = () => {
  const { data: blocos = [], isLoading } = useBlocos();
  const { data: flags = [] } = useFlags();
  const toggleAtivo = useToggleBlocoAtivo();

  const nomeDaFlag = useMemo(() => new Map(flags.map((f) => [f.id, f.nome])), [flags]);

  const [busca, setBusca] = useState('');
  const [prateleira, setPrateleira] = useState<Prateleira>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroFlag, setFiltroFlag] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [dialog, setDialog] = useState<{ open: boolean; bloco: BlocoComVersao | null }>({ open: false, bloco: null });

  const categorias = useMemo(
    () => [...new Set(blocos.map((b) => b.categoria).filter(Boolean) as string[])].sort(),
    [blocos],
  );

  const filtrosAvancadosAtivos =
    (filtroCategoria !== 'todas' ? 1 : 0) + (filtroFlag !== 'todas' ? 1 : 0) + (filtroStatus !== 'todos' ? 1 : 0);

  const limparFiltros = () => {
    setFiltroCategoria('todas');
    setFiltroFlag('todas');
    setFiltroStatus('todos');
  };

  // Busca + filtros avançados, ANTES do recorte por prateleira — assim as
  // contagens das abas continuam vivas e mostram onde estão os resultados.
  const blocosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return blocos.filter((b) => {
      if (filtroStatus === 'ativos' && !b.ativo) return false;
      if (filtroStatus === 'inativos' && b.ativo) return false;
      if (filtroCategoria !== 'todas' && b.categoria !== filtroCategoria) return false;
      if (filtroFlag !== 'todas' && !b.flag_ids.includes(filtroFlag)) return false;
      if (!q) return true;
      return (
        b.nome.toLowerCase().includes(q) ||
        (b.categoria ?? '').toLowerCase().includes(q) ||
        (b.versao_atual?.conteudo ?? '').toLowerCase().includes(q)
      );
    });
  }, [blocos, busca, filtroCategoria, filtroFlag, filtroStatus]);

  const contagemPorTipo = useMemo(() => {
    const contagem = new Map<TipoBloco, number>(TIPOS_BLOCO.map((t) => [t, 0]));
    for (const b of blocosFiltrados) {
      const tipo = (b.tipo as TipoBloco) ?? 'livre';
      contagem.set(tipo, (contagem.get(tipo) ?? 0) + 1);
    }
    return contagem;
  }, [blocosFiltrados]);

  const blocosVisiveis = useMemo(
    () => (prateleira === 'todos' ? blocosFiltrados : blocosFiltrados.filter((b) => ((b.tipo as TipoBloco) ?? 'livre') === prateleira)),
    [blocosFiltrados, prateleira],
  );

  // Agrupa por tipo estrutural (ordem de TIPOS_BLOCO) e, dentro dele, por categoria
  // (alfabética, sem categoria por último). Grupos vazios não aparecem.
  const grupos = useMemo(() => {
    const porTipo = new Map<TipoBloco, BlocoComVersao[]>(TIPOS_BLOCO.map((t) => [t, []]));
    for (const b of blocosVisiveis) porTipo.get((b.tipo as TipoBloco) ?? 'livre')!.push(b);
    return TIPOS_BLOCO.map((tipo) => {
      const doTipo = porTipo.get(tipo)!;
      const porCategoria = new Map<string | null, BlocoComVersao[]>();
      for (const b of doTipo) {
        const categoria = b.categoria || null;
        if (!porCategoria.has(categoria)) porCategoria.set(categoria, []);
        porCategoria.get(categoria)!.push(b);
      }
      const subgrupos = [...porCategoria.entries()]
        .map(([categoria, blocosDaCategoria]) => ({ categoria, blocos: blocosDaCategoria }))
        .sort((a, b) => {
          if (a.categoria === null) return 1;
          if (b.categoria === null) return -1;
          return a.categoria.localeCompare(b.categoria);
        });
      return { tipo, total: doTipo.length, subgrupos };
    }).filter((g) => g.total > 0);
  }, [blocosVisiveis]);

  // Stagger da entrada dos cards: delay na ordem de exibição, com teto para
  // bibliotecas grandes (depois do 15º card todos entram juntos — a onda já
  // foi percebida e ninguém fica esperando o fim da fila para trabalhar).
  const delayPorBloco = useMemo(() => {
    const delays = new Map<string, number>();
    let i = 0;
    for (const g of grupos)
      for (const sg of g.subgrupos)
        for (const b of sg.blocos) delays.set(b.id, Math.min(i++, 15) * 30);
    return delays;
  }, [grupos]);

  const abrirNovo = () => setDialog({ open: true, bloco: null });
  const abrirEdicao = (b: BlocoComVersao) => setDialog({ open: true, bloco: b });

  return (
    <OsgLayout
      title="Biblioteca de Modelos"
      subtitle="Blocos de texto reutilizáveis com campos — as peças que compõem os documentos"
      headerActions={
        <Button size="sm" onClick={abrirNovo} className="bg-osg-600 hover:bg-osg-700">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo bloco
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Prateleiras: um tipo por vez no lugar dos grupos empilhados. */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-osg-100 bg-osg-50 p-1">
            {PRATELEIRAS.map(({ valor, label, Icone }) => {
              const ativo = prateleira === valor;
              const total = valor === 'todos' ? blocosFiltrados.length : contagemPorTipo.get(valor) ?? 0;
              return (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setPrateleira(valor)}
                  className={cn(
                    'relative flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    ativo
                      ? 'bg-white text-osg-700 shadow-sm'
                      : 'text-muted-foreground hover:bg-osg-100/60 hover:text-osg-700',
                  )}
                >
                  <Icone className="h-3.5 w-3.5" />
                  {label}
                  <span className={cn('text-[10px] tabular-nums', ativo ? 'text-osg-600' : 'text-muted-foreground/70')}>
                    {total}
                  </span>
                  {ativo && <span aria-hidden className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-osg-moss" />}
                </button>
              );
            })}
          </div>

          <div className="relative ml-auto w-full min-w-[200px] sm:w-auto sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar bloco por nome ou texto…"
              className="pl-9"
            />
          </div>

          {/* Filtros avançados fora da visão inicial: categoria, flag e status
              interessam de vez em quando — moram num popover único. */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {filtrosAvancadosAtivos > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-osg-moss px-1 text-[10px] font-bold text-white">
                    {filtrosAvancadosAtivos}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as categorias</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c} value={c}>
                        {nomeCategoria(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {flags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Flag de composição</Label>
                  <Select value={filtroFlag} onValueChange={setFiltroFlag}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Flag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas as flags</SelectItem>
                      {flags.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativos">Ativos</SelectItem>
                    <SelectItem value="inativos">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtrosAvancadosAtivos > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="h-8 w-full text-xs text-muted-foreground hover:text-osg-700"
                >
                  <FilterX className="h-3.5 w-3.5 mr-1.5" />
                  Limpar filtros
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
          </div>
        ) : blocosVisiveis.length === 0 ? (
          <div className="rounded-lg border border-dashed border-osg-200 py-16 text-center">
            <LibraryBig className="mx-auto mb-3 h-8 w-8 text-osg-300" />
            {blocos.length === 0 ? (
              <>
                <p className="font-medium text-osg-700">A biblioteca ainda está vazia</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crie o primeiro bloco de texto — ele vira peça dos documentos gerados.
                </p>
                <Button size="sm" onClick={abrirNovo} className="mt-4 bg-osg-600 hover:bg-osg-700">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar primeiro bloco
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum bloco encontrado{busca.trim() ? ` para “${busca.trim()}”` : ''} nesta prateleira.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-7">
            {grupos.map(({ tipo, total, subgrupos }) => {
              const { label, Icone } = GRUPO_POR_TIPO[tipo];
              // Sub-cabeçalho de categoria só quando há o que distinguir.
              const mostrarCategorias = subgrupos.length > 1 || subgrupos[0]?.categoria !== null;
              return (
                <section key={tipo}>
                  {prateleira === 'todos' && (
                    <div className="mb-3 flex items-center gap-2">
                      <Icone className="h-4 w-4 text-osg-600" />
                      <h2 className="text-sm font-bold uppercase tracking-wide text-osg-700">{label}</h2>
                      <span className="text-xs tabular-nums text-muted-foreground">{total}</span>
                      <span aria-hidden className="h-px flex-1 bg-osg-100" />
                    </div>
                  )}
                  <div className="space-y-5">
                    {subgrupos.map(({ categoria, blocos: blocosDaCategoria }) => (
                      <div key={categoria ?? '__sem_categoria'}>
                        {mostrarCategorias && (
                          <div className="mb-2 flex items-center gap-1.5 pl-1">
                            <Tag className="h-3 w-3 text-osg-moss" />
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {categoria ? nomeCategoria(categoria) : 'Sem categoria'}
                            </h3>
                            <span className="text-[10px] text-muted-foreground">{blocosDaCategoria.length}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                          {blocosDaCategoria.map((b) => (
                            <FichaBloco
                              key={b.id}
                              bloco={b}
                              tipo={tipo}
                              nomeDaFlag={nomeDaFlag}
                              delay={delayPorBloco.get(b.id) ?? 0}
                              onEditar={() => abrirEdicao(b)}
                              onToggleAtivo={() => toggleAtivo.mutate({ id: b.id, ativo: !b.ativo })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <EditorBlocoDialog
        open={dialog.open}
        bloco={dialog.bloco}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </OsgLayout>
  );
};

export default BibliotecaModelos;
