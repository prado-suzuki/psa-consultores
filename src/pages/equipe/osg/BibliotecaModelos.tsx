import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Pencil,
  FileText,
  Search,
  Power,
  Loader2,
  Braces,
  Flag,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ScrollText,
  Pilcrow,
  StickyNote,
  FilterX,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { extrairCampos, LABEL_TIPO_BLOCO, TIPOS_BLOCO, type TipoBloco } from '@/lib/templates';
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

const BibliotecaModelos = () => {
  const { data: blocos = [], isLoading } = useBlocos();
  const { data: flags = [] } = useFlags();
  const toggleAtivo = useToggleBlocoAtivo();

  const nomeDaFlag = useMemo(() => new Map(flags.map((f) => [f.id, f.nome])), [flags]);

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroFlag, setFiltroFlag] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [gruposRecolhidos, setGruposRecolhidos] = useState<Set<TipoBloco>>(new Set());
  const [dialog, setDialog] = useState<{ open: boolean; bloco: BlocoComVersao | null }>({ open: false, bloco: null });

  const categorias = useMemo(
    () => [...new Set(blocos.map((b) => b.categoria).filter(Boolean) as string[])].sort(),
    [blocos],
  );

  const temFiltro = busca.trim() !== '' || filtroCategoria !== 'todas' || filtroFlag !== 'todas' || filtroStatus !== 'todos';

  const limparFiltros = () => {
    setBusca('');
    setFiltroCategoria('todas');
    setFiltroFlag('todas');
    setFiltroStatus('todos');
  };

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

  // Agrupa por tipo estrutural (ordem de TIPOS_BLOCO) e, dentro dele, por categoria
  // (alfabética, sem categoria por último). Grupos vazios não aparecem.
  const grupos = useMemo(() => {
    const porTipo = new Map<TipoBloco, BlocoComVersao[]>(TIPOS_BLOCO.map((t) => [t, []]));
    for (const b of blocosFiltrados) porTipo.get((b.tipo as TipoBloco) ?? 'livre')!.push(b);
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
  }, [blocosFiltrados]);

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

  const alternarGrupo = (tipo: TipoBloco) =>
    setGruposRecolhidos((s) => {
      const next = new Set(s);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });

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
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, categoria ou conteúdo"
              className="pl-9"
            />
          </div>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {flags.length > 0 && (
            <Select value={filtroFlag} onValueChange={setFiltroFlag}>
              <SelectTrigger className="w-[180px]">
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
          )}
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativos">Ativos</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
            </SelectContent>
          </Select>
          {temFiltro && (
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-osg-700"
            >
              <FilterX className="h-3.5 w-3.5 mr-1.5" />
              Limpar
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
          </div>
        ) : blocosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              {blocos.length === 0
                ? 'Nenhum bloco ainda. Crie o primeiro com "Novo bloco".'
                : 'Nenhum bloco corresponde aos filtros.'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grupos.map(({ tipo, total, subgrupos }) => {
              const { label, Icone } = GRUPO_POR_TIPO[tipo];
              const recolhido = gruposRecolhidos.has(tipo);
              // Sub-cabeçalho de categoria só quando há o que distinguir.
              const mostrarCategorias = subgrupos.length > 1 || subgrupos[0]?.categoria !== null;
              return (
                <section key={tipo}>
                  <button
                    type="button"
                    onClick={() => alternarGrupo(tipo)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border border-osg-100 bg-osg-50 px-3 py-2.5 text-left transition-colors hover:bg-osg-100',
                      !recolhido && 'mb-3',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-osg-600 text-white">
                      <Icone className="h-4 w-4" />
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-osg-700">{label}</h2>
                    <Badge className="bg-white text-osg-700 border border-osg-200 hover:bg-white text-[11px] font-semibold">
                      {total}
                    </Badge>
                    {recolhido ? (
                      <ChevronRight className="h-4 w-4 text-osg-600 ml-auto" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-osg-600 ml-auto" />
                    )}
                  </button>
                  {!recolhido && (
                    <div className="space-y-5">
                      {subgrupos.map(({ categoria, blocos: blocosDaCategoria }) => (
                        <div key={categoria ?? '__sem_categoria'}>
                          {mostrarCategorias && (
                            <div className="flex items-center gap-1.5 mb-2 pl-1">
                              <Tag className="h-3 w-3 text-osg-moss" />
                              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {categoria ?? 'Sem categoria'}
                              </h3>
                              <span className="text-[10px] text-muted-foreground">{blocosDaCategoria.length}</span>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {blocosDaCategoria.map((b) => {
                              const campos = extrairCampos(b.versao_atual?.conteudo ?? '');
                              return (
                                <Card
                                  key={b.id}
                                  className={cn(
                                    // Borda marrom-areia atenuada + sombra tonal — delimita sem cara de sépia.
                                    'group flex flex-col rounded-md border-osg-300/60 shadow-sm shadow-osg-300/30 animate-osg-card-in',
                                    // Hover: o card "flutua" acima dos vizinhos (z + translate + scale)
                                    // para ampliar um pouco o preview; relative habilita o z-index.
                                    // Scale discreto: quem amplia a leitura é o painel sobreposto do preview.
                                    'relative transition-all duration-200 hover:z-10 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-osg-300 hover:shadow-xl hover:shadow-osg-300/40',
                                    !b.ativo && 'opacity-60',
                                  )}
                                  style={{ animationDelay: `${delayPorBloco.get(b.id) ?? 0}ms` }}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <CardTitle className="text-base font-semibold leading-tight">
                                        {nomeExibido(b.nome, tipo)}
                                        {/* Traço-destaque moss: quebra a homogeneidade sem colorir o texto. */}
                                        <span aria-hidden className="block mt-1.5 h-1 w-10 rounded-full bg-osg-moss" />
                                      </CardTitle>
                                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEdicao(b)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          title={b.ativo ? 'Desativar' : 'Ativar'}
                                          onClick={() => toggleAtivo.mutate({ id: b.id, ativo: !b.ativo })}
                                        >
                                          <Power className={`h-3.5 w-3.5 ${b.ativo ? 'text-osg-600' : 'text-muted-foreground'}`} />
                                        </Button>
                                      </div>
                                    </div>
                                    {(b.flag_ids.length > 0 || !b.ativo) && (
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {b.flag_ids.map((id) => (
                                          <Badge key={id} className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1">
                                            <Flag className="h-2.5 w-2.5" />
                                            {nomeDaFlag.get(id) ?? '…'}
                                          </Badge>
                                        ))}
                                        {!b.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}
                                      </div>
                                    )}
                                  </CardHeader>
                                  <CardContent className="pt-0 flex flex-col flex-1">
                                    <div className="relative">
                                      <p className="text-sm text-muted-foreground italic line-clamp-3 leading-relaxed border-l-2 border-osg-100 pl-2.5">
                                        {b.versao_atual?.conteudo || 'sem conteúdo'}
                                      </p>
                                      {/* Preview completo no hover: painel sobreposto alinhado ao trecho
                                          clampado — o texto "cresce no lugar" por cima dos vizinhos, sem
                                          mexer no grid. pointer-events-none: o hover é regido só pelo card,
                                          então o painel não gruda quando vaza para fora dele. O delay-300
                                          (só na entrada — na saída vale o delay-0 do estado base) evita
                                          abrir quando o mouse está só de passagem pelo grid. */}
                                      <div className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-200 delay-0 group-hover:delay-300 absolute -inset-x-2 -top-2 z-30 rounded-md border border-osg-300 bg-card p-2 shadow-xl shadow-osg-300/40 max-h-[60vh] overflow-hidden">
                                        <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-osg-100 pl-2.5 whitespace-pre-wrap">
                                          {b.versao_atual?.conteudo || 'sem conteúdo'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-auto pt-3">
                                      <div className="flex items-center gap-1 flex-wrap border-t border-border/60 pt-2">
                                        {campos.length > 0 && (
                                          <>
                                            <Braces className="h-3 w-3 text-osg-600" />
                                            {campos.map((c) => (
                                              <code key={c} className="text-[10px] bg-osg-50 text-osg-700 rounded px-1 py-0.5">{c}</code>
                                            ))}
                                          </>
                                        )}
                                        <span className="text-[10px] text-muted-foreground ml-auto">
                                          v{b.versao_atual?.numero_versao ?? '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
