import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, ChevronDown, ChevronRight, Download, FileText, FolderArchive,
  FolderOpen, Inbox, Landmark, ScrollText, Trash2, Upload, User, Users,
} from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useAllMatriculas, useBensByCliente } from '@/hooks/useDiagnosticoPatrimonial';
import {
  useBaixarDocumento, useDocumentosByCliente, useExcluirDocumento,
  type DocumentoArquivoRow, type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';
import { categoriaLabel, formatBytes } from '@/components/equipe/osg/documentos/docMeta';
import { DocUploadDialog } from '@/components/equipe/osg/documentos/DocUploadDialog';

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

  const [selected, setSelected] = useState<string>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

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
    if (pessoaSubgroups.length) grps.push({ key: 'pessoas', label: 'Qualificação das Partes', Icon: Users, docs: flat(pessoaDocs), leaves: [], subgroups: pessoaSubgroups });
    if (bemLeaves.length) grps.push({ key: 'bens', label: 'Bens', Icon: Landmark, docs: flat(bemDocs), leaves: bemLeaves });
    if (matriculaLeaves.length) grps.push({ key: 'matriculas', label: 'Controle de Matrículas', Icon: ScrollText, docs: flat(matriculaDocs), leaves: matriculaLeaves });

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
    () => pessoas.map((p) => ({ id: p.id, label: p.denominacao ?? 'Pessoa' }))
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

  const vinculoLabel = (d: DocumentoArquivoRow): string => {
    if (d.pessoa_id) return labelByKey.get(`pessoa:${d.pessoa_id}`) ?? 'Pessoa';
    if (d.matricula_id) return labelByKey.get(`matricula:${d.matricula_id}`) ?? 'Matrícula';
    if (d.bem_id) return labelByKey.get(`bem:${d.bem_id}`) ?? 'Bem';
    return 'Sem vínculo';
  };

  const isExp = (k: string) => expanded[k] !== false;
  const toggle = (k: string) => setExpanded((s) => ({ ...s, [k]: !(s[k] !== false) }));

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
              {groups.map((g) => (
                <div key={g.key}>
                  <TreeRow
                    active={selected === g.key}
                    onClick={() => setSelected(g.key)}
                    Icon={g.Icon}
                    label={g.label}
                    count={g.docs.length}
                    expandable
                    expanded={isExp(g.key)}
                    onToggle={() => toggle(g.key)}
                  />
                  {/* Subgrupos (ex.: Pessoas → PF/PJ), cada um expansível até as entidades. */}
                  {isExp(g.key) && g.subgroups?.map((sg) => (
                    <div key={sg.key}>
                      <TreeRow
                        active={selected === sg.key}
                        onClick={() => setSelected(sg.key)}
                        Icon={sg.Icon}
                        label={sg.label}
                        count={sg.docs.length}
                        depth={1}
                        expandable
                        expanded={isExp(sg.key)}
                        onToggle={() => toggle(sg.key)}
                      />
                      {isExp(sg.key) && sg.leaves.map((lf) => (
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
                    </div>
                  ))}
                  {/* Grupos sem subgrupos (Bens, Matrículas): folhas direto no nível 1. */}
                  {isExp(g.key) && !g.subgroups && g.leaves.map((lf) => (
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
                </div>
              ))}
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
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" /> Anexar
                </Button>
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
                  <ul className="divide-y divide-osg-100/70">
                    {selectedDocs.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 px-2 py-2.5 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-osg-moss/70" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{d.nome_original}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {categoriaLabel(d.categoria)} · {vinculoLabel(d)} · {formatBytes(d.tamanho)} ·{' '}
                            {new Date(d.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)} title="Baixar">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)} title="Remover">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
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

function TreeRow({
  active, onClick, Icon, label, count, depth = 0, expandable, expanded, onToggle,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  label: string;
  count: number;
  depth?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
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
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className="shrink-0 text-slate-400 hover:text-osg-700"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
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
