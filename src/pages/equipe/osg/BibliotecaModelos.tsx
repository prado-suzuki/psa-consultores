import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FichaBloco } from '@/components/equipe/osg/biblioteca/FichaBloco';
import {
  Plus,
  Search,
  Loader2,
  BookOpen,
  ScrollText,
  Pilcrow,
  StickyNote,
  FilterX,
  Tag,
  SlidersHorizontal,
  LibraryBig,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TIPOS_BLOCO, type TipoBloco } from '@/lib/templates';
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

// Categorias são slugs (descricao_imovel) — na tela viram texto de gente.
const nomeCategoria = (categoria: string) => categoria.replace(/_/g, ' ');

// Uma família tem UMA carta, então tudo que as variantes carregam conta como
// sendo da cabeça: busca, categoria, flag e status olham o mesmo conjunto. Se só
// a busca olhasse as variantes, um filtro por flag de variante esconderia a
// família que a busca acabou de encontrar.
const textosDoBloco = (b: BlocoComVersao) => [
  b.nome,
  b.categoria ?? '',
  b.descricao ?? '',
  b.versao_atual?.conteudo ?? '',
];

const textosDaVariante = (v: BlocoComVersao) => [
  v.nome,
  v.variante_rotulo ?? '',
  v.descricao ?? '',
  v.versao_atual?.conteudo ?? '',
];

const casaTexto = (textos: string[], q: string) => textos.some((t) => t.toLowerCase().includes(q));

const categoriasDaFamilia = (b: BlocoComVersao) => [b.categoria, ...b.variantes.map((v) => v.categoria)];

const flagsDaFamilia = (b: BlocoComVersao) => [...b.flag_ids, ...b.variantes.flatMap((v) => v.flag_ids)];

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

  // Variante que o deep-link apontou, para o deck abrir nela. Vale enquanto o
  // editor que o deep-link abriu estiver na tela: fechado, a fixação já cumpriu o
  // papel e é solta, senão ela mandaria no deck para sempre.
  const [varianteFixada, setVarianteFixada] = useState<{ blocoId: string; varianteId: string } | null>(null);

  // Deep-link da tela Gerar (?bloco=<id>): abre o editor do bloco assim que a
  // lista chega e limpa o parâmetro para não reabrir o modal ao fechá-lo.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const blocoIdParam = searchParams.get('bloco');
    if (!blocoIdParam || blocos.length === 0) return;
    // O id pode ser de uma variante, que não tem carta própria: resolve para a
    // cabeça da família e o deck já abre na variante apontada.
    const cabeca = blocos.find((b) => b.id === blocoIdParam);
    const daVariante = cabeca ? null : blocos.find((b) => b.variantes.some((v) => v.id === blocoIdParam));
    const alvo = cabeca ?? daVariante;
    if (alvo) {
      setDialog({ open: true, bloco: alvo });
      setVarianteFixada(daVariante ? { blocoId: alvo.id, varianteId: blocoIdParam } : null);
      const next = new URLSearchParams(searchParams);
      next.delete('bloco');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, blocos, setSearchParams]);

  const categorias = useMemo(
    () => [...new Set(blocos.flatMap(categoriasDaFamilia).filter(Boolean) as string[])].sort(),
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
      // Variante desativada é pendência da família: ela aparece em "inativos"
      // mesmo com a cabeça ligada, senão o problema fica invisível na tela.
      if (filtroStatus === 'inativos' && b.ativo && b.variantes.every((v) => v.ativo)) return false;
      if (filtroCategoria !== 'todas' && !categoriasDaFamilia(b).includes(filtroCategoria)) return false;
      if (filtroFlag !== 'todas' && !flagsDaFamilia(b).includes(filtroFlag)) return false;
      if (!q) return true;
      return casaTexto(textosDoBloco(b), q) || b.variantes.some((v) => casaTexto(textosDaVariante(v), q));
    });
  }, [blocos, busca, filtroCategoria, filtroFlag, filtroStatus]);

  // Busca que casou só numa variante: o deck precisa abrir NELA, senão o
  // resultado aparece sem o termo procurado em lugar nenhum da carta.
  const varianteDaBusca = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const porBloco = new Map<string, string>();
    if (!q) return porBloco;
    for (const b of blocos) {
      if (b.variantes.length === 0 || casaTexto(textosDoBloco(b), q)) continue;
      const achada = b.variantes.find((v) => casaTexto(textosDaVariante(v), q));
      if (achada) porBloco.set(b.id, achada.id);
    }
    return porBloco;
  }, [blocos, busca]);

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
        // Sempre a categoria da CABEÇA, mesmo quando o filtro casou pela categoria
        // de uma variante: a carta é da família e agrupar pela variante duplicaria
        // carta. Não é bug.
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
                              // Busca ganha da fixação do deep-link: o termo é o
                              // que a pessoa está procurando agora.
                              varianteDestaqueId={
                                varianteDaBusca.get(b.id) ??
                                (varianteFixada?.blocoId === b.id ? varianteFixada.varianteId : undefined)
                              }
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
        onOpenChange={(open) => {
          setDialog((d) => ({ ...d, open }));
          // Editor fechado: a variante que o deep-link apontou já foi mostrada e
          // solta o deck, que volta a obedecer só a busca e a navegação manual.
          if (!open) setVarianteFixada(null);
        }}
      />
    </OsgLayout>
  );
};

export default BibliotecaModelos;
