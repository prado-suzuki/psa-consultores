import { useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, ChevronRight, Download, FolderArchive,
  FolderOpen, FolderUp, Inbox, Landmark, Link2, Pencil, ScrollText, Trash2, Upload, User, Users,
} from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useAllMatriculas, useBensByCliente } from '@/hooks/useDiagnosticoPatrimonial';
import {
  useBaixarDocumento, useDocumentosByCliente, useExcluirDocumento, usePreviewUrl,
  type DocumentoArquivoRow, type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';
import { CATEGORIAS, fileIconOf, formatBytes, isPreviavel } from '@/components/equipe/osg/documentos/docMeta';
import { DocUploadDialog } from '@/components/equipe/osg/documentos/DocUploadDialog';
import { DocVinculoDialog } from '@/components/equipe/osg/documentos/DocVinculoDialog';
import { DocRenomearDialog } from '@/components/equipe/osg/documentos/DocRenomearDialog';
import { DocPreviewDialog } from '@/components/equipe/osg/documentos/DocPreviewDialog';
import { UploadMassaDialog } from '@/components/equipe/osg/documentos/UploadMassaDialog';

interface Leaf {
  key: string;
  label: string;
  Icon: LucideIcon;
  docs: DocumentoArquivoRow[];
  vinculo: VinculoDoc;
}
interface SubGroup {
  key: string;
  label: string;
  Icon: LucideIcon;
  docs: DocumentoArquivoRow[];
  leaves: Leaf[];
}
interface Group {
  key: string;
  label: string;
  Icon: LucideIcon;
  docs: DocumentoArquivoRow[];
  leaves: Leaf[];
  subgroups?: SubGroup[];
}

const bemLabelOf = (b?: { referencia_dp: string | null; denominacao: string | null }) =>
  [b?.referencia_dp, b?.denominacao].filter(Boolean).join(' — ') || 'Bem';

const DocumentosCliente = () => {
  const { clienteId } = useOsgWork();

  const { data: docs = [], isLoading } = useDocumentosByCliente(clienteId || null);
  const { data: pessoas = [] } = usePessoasByCliente(clienteId || null);
  const { data: bens = [] } = useBensByCliente(clienteId || null);
  const { data: allMatriculas = [] } = useAllMatriculas();

  const excluir = useExcluirDocumento(clienteId || '');
  const baixar = useBaixarDocumento();
  const preview = usePreviewUrl();

  const [selected, setSelected] = useState<string>('all');
  const [hoverOpen, setHoverOpen] = useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMassaOpen, setUploadMassaOpen] = useState(false);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);
  const [aVincular, setAVincular] = useState<DocumentoArquivoRow | null>(null);
  const [aRenomear, setARenomear] = useState<DocumentoArquivoRow | null>(null);
  const [aVisualizar, setAVisualizar] = useState<DocumentoArquivoRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // useAllMatriculas é global; restringe às matrículas deste cliente (via bem ou titular).
  const matriculasCliente = useMemo(
    () => allMatriculas.filter(
      (m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId),
    ),
    [allMatriculas, clienteId],
  );

  // Árvore de pastas derivada dos próprios documentos + lookups de rótulo.
  const { groups, semVinculoDocs, docsByKey, labelByKey, vinculoByKey } = useMemo(() => {
    const pById = new Map(pessoas.map((p) => [p.id, p]));
    const bById = new Map(bens.map((b) => [b.id, b]));
    const mById = new Map(matriculasCliente.map((m) => [m.id, m]));

    const pessoaDocs = new Map<string, DocumentoArquivoRow[]>();
    const bemDocs = new Map<string, DocumentoArquivoRow[]>();
    const matriculaDocs = new Map<string, DocumentoArquivoRow[]>();
    const sem: DocumentoArquivoRow[] = [];

    const add = (mp: Map<string, DocumentoArquivoRow[]>, id: string, d: DocumentoArquivoRow) => {
      const arr = mp.get(id);
      if (arr) arr.push(d);
      else mp.set(id, [d]);
    };
    // Prioridade pessoa > matrícula > bem: docs de matrícula carregam o bem_id do
    // imóvel-pai, mas pertencem à pasta da matrícula (mais específica).
    for (const d of docs) {
      if (d.pessoa_id) add(pessoaDocs, d.pessoa_id, d);
      else if (d.matricula_id) add(matriculaDocs, d.matricula_id, d);
      else if (d.bem_id) add(bemDocs, d.bem_id, d);
      else sem.push(d);
    }

    const byPt = (a: Leaf, b: Leaf) => a.label.localeCompare(b.label, 'pt-BR');
    const flat = (mp: Map<string, DocumentoArquivoRow[]>) =>
      [...mp.values()].flat().sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));

    // Pessoas divididas em PF/PJ (via tipo_pessoa) — dois subgrupos na árvore.
    const pessoaEntries = [...pessoaDocs.entries()].map(([id, ds]) => {
      const p = pById.get(id);
      const isPJ = p?.tipo_pessoa === 'PJ';
      return {
        isPJ,
        docs: ds,
        leaf: {
          key: `pessoa:${id}`,
          label: p?.denominacao ?? 'Pessoa removida',
          Icon: isPJ ? Building2 : User,
          docs: ds,
          vinculo: { pessoaId: id } as VinculoDoc,
        } as Leaf,
      };
    });
    const sortDocs = (arr: DocumentoArquivoRow[]) =>
      [...arr].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const pfLeaves = pessoaEntries.filter((e) => !e.isPJ).map((e) => e.leaf).sort(byPt);
    const pjLeaves = pessoaEntries.filter((e) => e.isPJ).map((e) => e.leaf).sort(byPt);
    const pfDocs = sortDocs(pessoaEntries.filter((e) => !e.isPJ).flatMap((e) => e.docs));
    const pjDocs = sortDocs(pessoaEntries.filter((e) => e.isPJ).flatMap((e) => e.docs));

    const bemLeaves: Leaf[] = [...bemDocs.entries()].map(([id, ds]) => ({
      key: `bem:${id}`,
      label: bemLabelOf(bById.get(id)),
      Icon: Landmark,
      docs: ds,
      vinculo: { bemId: id } as VinculoDoc,
    })).sort(byPt);

    const matriculaLeaves: Leaf[] = [...matriculaDocs.entries()].map(([id, ds]) => {
      const m = mById.get(id);
      return {
        key: `matricula:${id}`,
        label: m ? `Matrícula ${m.numero}` : 'Matrícula removida',
        Icon: ScrollText,
        docs: ds,
        vinculo: { matriculaId: id } as VinculoDoc,
      };
    }).sort(byPt);

    // "Pessoas" é o nó pai; PF/PJ são subgrupos expansíveis dentro dele.
    const pessoaSubgroups: SubGroup[] = [];
    if (pfLeaves.length) pessoaSubgroups.push({ key: 'pessoas_pf', label: 'Pessoas Físicas', Icon: User, docs: pfDocs, leaves: pfLeaves });
    if (pjLeaves.length) pessoaSubgroups.push({ key: 'pessoas_pj', label: 'Pessoas Jurídicas', Icon: Building2, docs: pjDocs, leaves: pjLeaves });

    const grps: Group[] = [];
    if (pessoaSubgroups.length) grps.push({ key: 'pessoas', label: 'Pessoas', Icon: Users, docs: flat(pessoaDocs), leaves: [], subgroups: pessoaSubgroups });
    if (bemLeaves.length) grps.push({ key: 'bens', label: 'Bens', Icon: Landmark, docs: flat(bemDocs), leaves: bemLeaves });
    if (matriculaLeaves.length) grps.push({ key: 'matriculas', label: 'Matrículas', Icon: ScrollText, docs: flat(matriculaDocs), leaves: matriculaLeaves });

    const dByKey = new Map<string, DocumentoArquivoRow[]>();
    const lByKey = new Map<string, string>();
    const vByKey = new Map<string, VinculoDoc>();
    dByKey.set('all', docs); lByKey.set('all', 'Todos os documentos');
    dByKey.set('sem', sem); lByKey.set('sem', 'Sem vínculo');
    const indexLeaves = (leaves: Leaf[]) => {
      for (const lf of leaves) {
        dByKey.set(lf.key, lf.docs); lByKey.set(lf.key, lf.label); vByKey.set(lf.key, lf.vinculo);
      }
    };
    for (const g of grps) {
      dByKey.set(g.key, g.docs); lByKey.set(g.key, g.label);
      indexLeaves(g.leaves);
      for (const sg of g.subgroups ?? []) {
        dByKey.set(sg.key, sg.docs); lByKey.set(sg.key, sg.label);
        indexLeaves(sg.leaves);
      }
    }

    return { groups: grps, semVinculoDocs: sem, docsByKey: dByKey, labelByKey: lByKey, vinculoByKey: vByKey };
  }, [docs, pessoas, bens, matriculasCliente]);

  // Opções para o seletor "vincular a" (todas as entidades, não só as com docs).
  const pessoaOpts = useMemo(
    () => pessoas.map((p) => ({ id: p.id, label: p.denominacao ?? 'Pessoa', tipo: p.tipo_pessoa }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [pessoas],
  );
  const bemOpts = useMemo(() => bens.map((b) => ({ id: b.id, label: bemLabelOf(b) })), [bens]);
  const matriculaOpts = useMemo(
    () => matriculasCliente.map((m) => ({ id: m.id, label: `Matrícula ${m.numero}`, numero: m.numero })),
    [matriculasCliente],
  );

  const selectedDocs = docsByKey.get(selected) ?? [];
  const selectedLabel = labelByKey.get(selected) ?? 'Documentos';
  const selectedVinculo = vinculoByKey.get(selected);

  // N7: agrupa os documentos da pasta selecionada por CATEGORIA (campo já gravado),
  // na ordem de CATEGORIAS. Só apresentação — sem mudança de schema.
  const gruposCategoria = (() => {
    const byCat = new Map<string, DocumentoArquivoRow[]>();
    for (const d of selectedDocs) {
      const a = byCat.get(d.categoria);
      if (a) a.push(d);
      else byCat.set(d.categoria, [d]);
    }
    return CATEGORIAS.filter((c) => byCat.has(c.value)).map((c) => ({ label: c.label, docs: byCat.get(c.value)! }));
  })();

  const abrirPreview = (d: DocumentoArquivoRow) => {
    setAVisualizar(d);
    setPreviewUrl(null);
    preview.mutate(d, { onSuccess: (u) => setPreviewUrl(u) });
  };

  const vinculoLabel = (d: DocumentoArquivoRow): string => {
    if (d.pessoa_id) return labelByKey.get(`pessoa:${d.pessoa_id}`) ?? 'Pessoa';
    if (d.matricula_id) return labelByKey.get(`matricula:${d.matricula_id}`) ?? 'Matrícula';
    if (d.bem_id) return labelByKey.get(`bem:${d.bem_id}`) ?? 'Bem';
    return 'Sem vínculo';
  };

  // Expansão por HOVER (como o agrupador "Oficina de Contratos"): abre ao passar o
  // cursor; um grupo que contém o item selecionado permanece aberto.
  const setOpen = (k: string, v: boolean) => setHoverOpen((s) => ({ ...s, [k]: v }));
  // Ao sair do grupo INTEIRO, recolhe o grupo e todos os seus subgrupos de uma vez.
  // Não recolhemos um subgrupo ao sair só dele — isso evitava o layout encolher sob
  // o cursor e fechar a seção toda (bug do hover entre PF e PJ).
  const closeGroup = (g: Group) =>
    setHoverOpen((s) => {
      const next = { ...s, [g.key]: false };
      for (const sg of g.subgroups ?? []) next[sg.key] = false;
      return next;
    });
  const groupHasSelected = (g: Group) =>
    selected === g.key
    || g.leaves.some((l) => l.key === selected)
    || (g.subgroups?.some((sg) => sg.key === selected || sg.leaves.some((l) => l.key === selected)) ?? false);
  const subHasSelected = (sg: SubGroup) => selected === sg.key || sg.leaves.some((l) => l.key === selected);

  return (
    <OsgLayout
      title="Documentos do Cliente"
      subtitle="Todos os arquivos recebidos, organizados por entidade"
    >
      {!clienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderArchive className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para navegar pelos documentos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="animate-osg-rise overflow-hidden rounded-xl border border-osg-300/60 bg-background shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(18,88,55,0.18)]">
          <div className="flex min-h-[60vh]">
            {/* Árvore de pastas */}
            <aside className="w-72 shrink-0 overflow-y-auto border-r border-osg-100 bg-osg-50/30 p-2">
              <TreeRow
                active={selected === 'all'}
                onClick={() => setSelected('all')}
                Icon={FolderOpen}
                label="Todos os documentos"
                count={docs.length}
              />
              {groups.map((g) => {
                const gOpen = hoverOpen[g.key] || groupHasSelected(g);
                return (
                  <div
                    key={g.key}
                    onMouseEnter={() => setOpen(g.key, true)}
                    onMouseLeave={() => closeGroup(g)}
                  >
                    <TreeRow
                      active={selected === g.key}
                      onClick={() => setSelected(g.key)}
                      Icon={g.Icon}
                      label={g.label}
                      count={g.docs.length}
                      expandable
                      expanded={gOpen}
                    />
                    <Collapse open={gOpen}>
                      {g.subgroups
                        ? g.subgroups.map((sg) => {
                            const sgOpen = hoverOpen[sg.key] || subHasSelected(sg);
                            return (
                              <div
                                key={sg.key}
                                onMouseEnter={() => setOpen(sg.key, true)}
                              >
                                <TreeRow
                                  active={selected === sg.key}
                                  onClick={() => setSelected(sg.key)}
                                  Icon={sg.Icon}
                                  label={sg.label}
                                  count={sg.docs.length}
                                  depth={1}
                                  expandable
                                  expanded={sgOpen}
                                />
                                <Collapse open={sgOpen}>
                                  {sg.leaves.map((lf) => (
                                    <TreeRow
                                      key={lf.key}
                                      active={selected === lf.key}
                                      onClick={() => setSelected(lf.key)}
                                      Icon={lf.Icon}
                                      label={lf.label}
                                      count={lf.docs.length}
                                      depth={2}
                                    />
                                  ))}
                                </Collapse>
                              </div>
                            );
                          })
                        : g.leaves.map((lf) => (
                            <TreeRow
                              key={lf.key}
                              active={selected === lf.key}
                              onClick={() => setSelected(lf.key)}
                              Icon={lf.Icon}
                              label={lf.label}
                              count={lf.docs.length}
                              depth={1}
                            />
                          ))}
                    </Collapse>
                  </div>
                );
              })}
              <TreeRow
                active={selected === 'sem'}
                onClick={() => setSelected('sem')}
                Icon={Inbox}
                label="Sem vínculo"
                count={semVinculoDocs.length}
              />
            </aside>

            {/* Conteúdo da pasta selecionada */}
            <section className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-osg-100 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-osg-700">{selectedLabel}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedDocs.length} {selectedDocs.length === 1 ? 'documento' : 'documentos'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setUploadMassaOpen(true)}>
                    <FolderUp className="mr-2 h-4 w-4" /> Em massa
                  </Button>
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" /> Anexar
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">Carregando…</p>
                ) : selectedDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-muted-foreground">
                    <FolderArchive className="h-10 w-10 opacity-40" />
                    <p className="text-sm">Nenhum documento nesta pasta.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setUploadOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" /> Anexar o primeiro
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gruposCategoria.map((g) => (
                      <div key={g.label}>
                        <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-osg-700/80">
                          <span>{g.label}</span>
                          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-500">
                            {g.docs.length}
                          </span>
                        </div>
                        <ul className="divide-y divide-osg-100/70">
                          {g.docs.map((d) => (
                            <li key={d.id} className="flex items-center gap-3 px-2 py-2.5 text-sm">
                              <FileIcon nome={d.nome_original} mime={d.mime} />
                              <div className="min-w-0 flex-1">
                                {isPreviavel(d.nome_original, d.mime) ? (
                                  <button
                                    type="button"
                                    onClick={() => abrirPreview(d)}
                                    className="block w-full min-w-0 truncate text-left font-medium text-slate-800 hover:text-osg-700 hover:underline"
                                    title="Pré-visualizar"
                                  >
                                    {d.nome_original}
                                  </button>
                                ) : (
                                  <p className="truncate font-medium text-slate-800">{d.nome_original}</p>
                                )}
                                <p className="truncate text-xs text-muted-foreground">
                                  {vinculoLabel(d)} · {formatBytes(d.tamanho)} ·{' '}
                                  {new Date(d.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setARenomear(d)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Renomear o nome exibido</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setAVincular(d)}>
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Vincular a pessoa, matrícula ou bem</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)}>
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar o arquivo</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remover da lista</TooltipContent>
                              </Tooltip>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {clienteId && (
        <DocUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          clienteId={clienteId}
          pessoas={pessoaOpts}
          bens={bemOpts}
          matriculas={matriculaOpts}
          vinculoInicial={selectedVinculo}
        />
      )}

      {clienteId && (
        <UploadMassaDialog
          open={uploadMassaOpen}
          onOpenChange={setUploadMassaOpen}
          clienteId={clienteId}
        />
      )}

      {clienteId && (
        <DocVinculoDialog
          open={!!aVincular}
          onOpenChange={(o) => !o && setAVincular(null)}
          doc={aVincular}
          clienteId={clienteId}
          pessoas={pessoaOpts}
          bens={bemOpts}
          matriculas={matriculaOpts}
        />
      )}

      {clienteId && (
        <DocRenomearDialog
          open={!!aRenomear}
          onOpenChange={(o) => !o && setARenomear(null)}
          doc={aRenomear}
          clienteId={clienteId}
        />
      )}

      <DocPreviewDialog
        open={!!aVisualizar}
        onOpenChange={(o) => {
          if (!o) {
            setAVisualizar(null);
            setPreviewUrl(null);
          }
        }}
        doc={aVisualizar}
        url={previewUrl}
      />

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece arquivado no storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir.id);
                setAExcluir(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OsgLayout>
  );
};

function FileIcon({ nome, mime }: { nome: string; mime: string | null }) {
  const { Icon, className } = fileIconOf(nome, mime);
  return <Icon className={cn('h-4 w-4 shrink-0', className)} />;
}

function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  // Mesma animação do agrupador "Oficina de Contratos" (grid-rows 0fr↔1fr +
  // overflow-hidden). `open` é dirigido por hover (ou pelo item selecionado).
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function TreeRow({
  active, onClick, Icon, label, count, depth = 0, expandable, expanded,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  count: number;
  depth?: number;
  expandable?: boolean;
  expanded?: boolean;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors',
        depth === 2 ? 'ml-8' : depth === 1 ? 'ml-4' : '',
        active
          ? 'bg-osg-100 font-medium text-osg-700'
          : 'text-slate-600 hover:bg-osg-50 hover:text-osg-700',
      )}
    >
      {expandable ? (
        <span className="shrink-0 text-slate-400">
          <ChevronRight
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-300 ease-out motion-reduce:transition-none',
              expanded && 'rotate-90',
            )}
          />
        </span>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span
        className={cn(
          'shrink-0 rounded-full px-1.5 text-[11px] tabular-nums',
          active ? 'bg-osg-200/70 text-osg-700' : 'bg-slate-100 text-slate-500',
        )}
      >
        {count}
      </span>
    </div>
  );
}

export default DocumentosCliente;
