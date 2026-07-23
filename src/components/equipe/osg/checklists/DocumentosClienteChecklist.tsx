import { useRef, useState } from 'react';
import {
  Archive, Check, ChevronDown, Download, FileDown, FileSearch, FileText, FolderPlus, Loader2, Search, Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import {
  useDocumentosByCliente, useBaixarDocumento, useUploadDocumento,
  type DocCategoria, type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES } from '@/components/equipe/osg/documentos/docMeta';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ProjectPrefillLocationState } from '@/lib/projetosCadastro';

const CAT_LABEL: Record<DocCategoria, string> = {
  declaracao_ir: 'Declaração de IR (DIRPF)',
  cadastros_fiscais: 'Cadastros fiscais',
  bens_direitos: 'Bens e direitos',
  agrarios: 'Agrários (contratos / matrículas)',
  societarios: 'Societários',
  sucessorios: 'Sucessórios',
  pessoais: 'Pessoais',
  georreferenciamento: 'Georreferenciamento',
  outros: 'Outros',
};

type ReqDoc = { assunto: string; descricao: string; cat: DocCategoria | null; kw: string[]; modelo?: boolean };
type ChecklistState = 'encontrado' | 'solicitar' | 'modelo';
type StatusFilter = 'todos' | ChecklistState;

const DOCS_FISCAL: ReqDoc[] = [
  { assunto: 'DIRPF', descricao: 'Declaração de IRPF do ano-calendário mais recente, de todos os envolvidos.', cat: 'declaracao_ir', kw: ['irpf', 'dirpf', 'declara'] },
  { assunto: 'Livro Caixa (LCDPR)', descricao: 'Livro Caixa Digital do Produtor Rural dos dois últimos anos-calendário.', cat: 'cadastros_fiscais', kw: ['lcdpr', 'livro caixa', 'coletanac'] },
  { assunto: 'Contratos de exploração', descricao: 'Aluguel e exploração rural vigentes, incluindo parceria, condomínio e arrendamento.', cat: 'agrarios', kw: ['contrato', 'parceria', 'arrenda', 'cess'] },
  { assunto: 'Bens da atividade rural', descricao: 'Relatório com datas e valores de aquisição, além dos valores atuais de mercado.', cat: 'bens_direitos', kw: ['bens', 'ativo', 'máquina', 'equipamento'] },
  { assunto: 'Dívidas da atividade rural', descricao: 'Relatório com os valores a pagar nos próximos anos, organizados por vencimento.', cat: null, kw: ['dívida', 'divida', 'emprést', 'emprest', 'financ'] },
  { assunto: 'Investimentos', descricao: 'Projeção dos investimentos previstos para os próximos anos.', cat: null, kw: ['investi'] },
  { assunto: 'Contrato social', descricao: 'Contratos sociais das pessoas jurídicas, CNPJs e respectivos regimes tributários.', cat: 'societarios', kw: ['contrato social', 'estatuto', 'altera'] },
  { assunto: 'Balanço, Balancete e DRE', descricao: 'Demonstrações dos três últimos exercícios das empresas do grupo, ainda que não registradas.', cat: null, kw: ['dre', 'balanç', 'balanc', 'demonstra'] },
  { assunto: 'Resultado projetado', descricao: 'Projeção do resultado de pessoas físicas e jurídicas por atividade, conforme o modelo de DRE.', cat: null, kw: [], modelo: true },
];

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'solicitar', label: 'A solicitar' },
  { value: 'encontrado', label: 'Encontrados' },
  { value: 'modelo', label: 'Modelos' },
];

const normalize = (value: string) => value.toLocaleLowerCase('pt-BR');

const matchDocs = (req: ReqDoc, docs: DocumentoArquivoRow[]): DocumentoArquivoRow[] =>
  docs.filter((doc) => {
    const nome = normalize(doc.nome_original ?? '');
    if (req.kw.some((keyword) => nome.includes(keyword))) return true;
    return !!req.cat && doc.categoria === req.cat;
  });

const itemState = (req: ReqDoc, matches: DocumentoArquivoRow[]): ChecklistState => {
  if (req.modelo) return 'modelo';
  return matches.length > 0 ? 'encontrado' : 'solicitar';
};

export function DocumentosClienteChecklist({ clienteId }: { clienteId: string }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: docs = [], isLoading } = useDocumentosByCliente(clienteId);
  const { data: clientes = [] } = useClientesLista();
  const baixar = useBaixarDocumento();
  const upload = useUploadDocumento();
  const [filtro, setFiltro] = useState<StatusFilter>('todos');
  const [busca, setBusca] = useState('');
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);

  const items = DOCS_FISCAL.map((req, index) => {
    const matches = matchDocs(req, docs);
    return { req, index, matches, state: itemState(req, matches) };
  });
  const checklistItems = items.filter((item) => item.state !== 'modelo');
  const encontrados = checklistItems.filter((item) => item.state === 'encontrado').length;
  const faltantes = checklistItems.length - encontrados;
  const progresso = checklistItems.length ? Math.round((encontrados / checklistItems.length) * 100) : 0;
  const matchedIds = new Set(items.flatMap((item) => item.matches.map((file) => file.id)));
  const orfaos = docs.filter((doc) => !matchedIds.has(doc.id));
  const termo = normalize(busca.trim());
  const itemsVisiveis = items
    .filter((item) => filtro === 'todos' || item.state === filtro)
    .filter((item) => !termo || [item.req.assunto, item.req.descricao, ...item.matches.map((file) => file.nome_original ?? '')]
      .some((value) => normalize(value).includes(termo)))
    .sort((a, b) => {
      const order: Record<ChecklistState, number> = { solicitar: 0, encontrado: 1, modelo: 2 };
      return order[a.state] - order[b.state] || a.index - b.index;
    });
  const clienteNome = clientes.find((cliente) => cliente.id === clienteId)?.nome;
  const podeCriarProjeto = isAdmin || progresso === 100;
  const baixarTodos = () => docs
    .filter((doc) => doc.gcs_uri)
    .forEach((doc, index) => window.setTimeout(() => baixar.mutate(doc), index * 500));
  const criarProjeto = () => {
    if (!podeCriarProjeto || !clienteNome) return;
    const state: ProjectPrefillLocationState = {
      projectPrefill: {
        clientId: clienteId,
        name: `${clienteNome} - Planejamento Tributário`,
        isMultidisciplinar: true,
        description: `Projeto multidisciplinar para elaboração do planejamento tributário de ${clienteNome}, com análise integrada da estrutura fiscal, societária, patrimonial e operacional do cliente. O trabalho compreenderá o levantamento e a validação das informações recebidas, a identificação de oportunidades de eficiência tributária e a construção de recomendações alinhadas às atividades e aos objetivos do grupo. Ao final, serão consolidados os cenários avaliados, os impactos estimados e o plano de ação para implementação das medidas aprovadas.`,
      },
    };
    navigate('/equipe/osg/projetos/cadastro', { state });
  };
  const anexarDocumento = (req: ReqDoc, file: File) => {
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50 MB.', variant: 'destructive' });
      return;
    }
    const identifiedFile = new File([file], `${req.assunto} - ${file.name}`, {
      type: file.type,
      lastModified: file.lastModified,
    });
    setUploadingItem(req.assunto);
    upload.mutate({
      clienteId,
      vinculo: {},
      categoria: req.cat ?? 'outros',
      file: identifiedFile,
    }, { onSettled: () => setUploadingItem(null) });
  };

  if (isLoading) return <ChecklistSkeleton />;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-osg-300/60 bg-white/80 p-5 shadow-[0_14px_40px_-28px_hsl(var(--osg-700)/0.35)] sm:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-osg-moss/5 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-osg-500">Coleta para análise tributária</span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-osg-700">
              Planejamento tributário{clienteNome ? ` de ${clienteNome}` : ''}
            </h2>
            <div className="mt-1 h-[3px] w-8 rounded-full bg-osg-moss" />
            <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-1">
              <span className="text-4xl font-extrabold leading-none tabular-nums text-osg-moss">{progresso}%</span>
              <span className="text-sm text-osg-500">{encontrados} de {checklistItems.length} requisitos com documentos encontrados</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-osg-100">
              <div className="h-full rounded-full bg-osg-moss transition-[width] duration-500" style={{ width: `${progresso}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-osg-100 lg:border-l lg:pl-7">
            <Metric label="A solicitar" value={faltantes} tone="warning" />
            <Metric label="Encontrados" value={encontrados} tone="success" />
            <div className="col-span-2 grid gap-2">
              <Button size="sm" className="w-full" onClick={criarProjeto} disabled={!podeCriarProjeto || !clienteNome}>
                <FolderPlus className="mr-2 h-4 w-4" /> Criar projeto
              </Button>
              <Button variant="outline" size="sm" className="w-full border-osg-200 bg-white" onClick={baixarTodos} disabled={!docs.length || baixar.isPending}>
                <Download className="mr-2 h-4 w-4" /> Baixar todos os arquivos
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-osg-200/70 bg-white/80 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]">
        <div className="space-y-3 border-b border-osg-100 bg-osg-50/45 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-osg-100 bg-osg-50 p-1">
              {FILTERS.map((item) => {
                const count = item.value === 'todos' ? items.length : items.filter((candidate) => candidate.state === item.value).length;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFiltro(item.value)}
                    aria-pressed={filtro === item.value}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                      filtro === item.value ? 'bg-white text-osg-700 shadow-sm' : 'text-osg-500 hover:bg-osg-100/60 hover:text-osg-700',
                    )}
                  >
                    {item.label}<span className="text-[10px] tabular-nums text-osg-500/75">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative min-w-[220px] flex-1 sm:ml-auto sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-osg-300" />
              <Input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar documento ou arquivo..." className="border-osg-200/80 bg-white pl-9" />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-osg-500">
            Os documentos encontrados são correspondências automáticas por categoria ou nome do arquivo e devem ser conferidos pela equipe.
          </p>
        </div>

        {itemsVisiveis.length > 0 ? (
          <ol className="divide-y divide-osg-100">
            {itemsVisiveis.map((item) => (
              <ChecklistRow
                key={item.req.assunto}
                number={item.index + 1}
                req={item.req}
                state={item.state}
                matches={item.matches}
                downloading={baixar.isPending}
                onDownload={(file) => baixar.mutate(file)}
                uploading={uploadingItem === item.req.assunto}
                uploadDisabled={upload.isPending}
                onUpload={(file) => anexarDocumento(item.req, file)}
              />
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center text-osg-500">
            <FileSearch className="h-8 w-8 text-osg-300" />
            <p className="text-sm font-semibold text-osg-700">Nenhum requisito encontrado</p>
            <p className="text-xs">Ajuste a busca ou selecione outro filtro.</p>
          </div>
        )}
      </section>

      {orfaos.length > 0 && <OtherDocuments files={orfaos} downloading={baixar.isPending} onDownload={(file) => baixar.mutate(file)} />}
    </div>
  );
}

function ChecklistRow({ number, req, state, matches, downloading, onDownload, uploading, uploadDisabled, onUpload }: {
  number: number;
  req: ReqDoc;
  state: ChecklistState;
  matches: DocumentoArquivoRow[];
  downloading: boolean;
  onDownload: (file: DocumentoArquivoRow) => void;
  uploading: boolean;
  uploadDisabled: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <li className={cn('group px-4 py-4 transition-colors sm:px-5', state === 'solicitar' ? 'bg-amber-50/20 hover:bg-amber-50/35' : 'hover:bg-osg-50/35')}>
      <div className="flex items-start gap-3 sm:gap-4">
        <span className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums',
          state === 'encontrado' && 'border-osg-moss/30 bg-osg-moss/10 text-osg-moss',
          state === 'solicitar' && 'border-amber-300/70 bg-amber-50 text-amber-700',
          state === 'modelo' && 'border-slate-200 bg-slate-50 text-slate-500',
        )}>
          {state === 'encontrado' ? <Check className="h-4 w-4" /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-osg-800">{req.assunto}</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">{req.descricao}</p>
            </div>
            <StatusPill state={state} count={matches.length} />
          </div>

          {matches.length === 1 && (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <FileDownloadButton file={matches[0]} downloading={downloading} onDownload={onDownload} />
            </div>
          )}

          {matches.length > 1 && (
            <Collapsible className="mt-3">
              <CollapsibleTrigger className="flex items-center gap-2 rounded-lg border border-osg-100 bg-osg-50/55 px-3 py-2 text-xs font-semibold text-osg-600 transition-colors hover:border-osg-200 hover:bg-osg-50 [&[data-state=open]_.chevron]:rotate-180">
                <FileText className="h-4 w-4 text-osg-moss" />
                <span>Ver {matches.length} documentos encontrados</span>
                <ChevronDown className="chevron h-3.5 w-3.5 text-osg-400 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 grid gap-2 lg:grid-cols-2">
                  {matches.map((file) => (
                    <FileDownloadButton key={file.id} file={file} downloading={downloading} onDownload={onDownload} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {state === 'modelo' && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-500">
              <FileDown className="h-4 w-4" /> Modelo de DRE utilizado para preparar a projeção
            </div>
          )}

          {state === 'solicitar' && (
            <PendingUploadButton req={req} uploading={uploading} disabled={uploadDisabled} onUpload={onUpload} />
          )}
        </div>
      </div>
    </li>
  );
}

function PendingUploadButton({ req, uploading, disabled, onUpload }: {
  req: ReqDoc;
  uploading: boolean;
  disabled: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onUpload(file);
  };
  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        aria-label={`Selecionar arquivo para ${req.assunto}`}
        onChange={onChange}
      />
      <Button type="button" variant="outline" size="sm" className="h-8 border-amber-200 bg-white text-xs text-amber-800 hover:bg-amber-50 hover:text-amber-900" onClick={() => inputRef.current?.click()} disabled={disabled}>
        {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
        {uploading ? 'Enviando...' : 'Anexar documento'}
      </Button>
    </div>
  );
}

function FileDownloadButton({ file, downloading, onDownload }: {
  file: DocumentoArquivoRow;
  downloading: boolean;
  onDownload: (file: DocumentoArquivoRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onDownload(file)}
      disabled={!file.gcs_uri || downloading}
      className="flex min-w-0 items-center gap-2 rounded-lg border border-osg-100 bg-osg-50/55 px-3 py-2 text-left transition-colors hover:border-osg-200 hover:bg-osg-50 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={`Baixar ${file.nome_original}`}
    >
      <FileText className="h-4 w-4 shrink-0 text-osg-moss" />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{file.nome_original}</span>
      <Download className="h-3.5 w-3.5 shrink-0 text-osg-400" />
    </button>
  );
}

function StatusPill({ state, count }: { state: ChecklistState; count: number }) {
  const config = {
    encontrado: { label: `Correspondência encontrada${count > 1 ? ` (${count})` : ''}`, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    solicitar: { label: 'A solicitar', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    modelo: { label: 'Modelo de referência', className: 'border-slate-200 bg-slate-50 text-slate-500' },
  }[state];
  return <span className={cn('inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold', config.className)}>{config.label}</span>;
}

function Metric({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'success' }) {
  return (
    <div className="rounded-xl bg-osg-50/70 px-3 py-3 text-center">
      <div className={cn('text-2xl font-bold tabular-nums', tone === 'warning' ? 'text-amber-700' : 'text-osg-moss')}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-osg-500">{label}</div>
    </div>
  );
}

function OtherDocuments({ files, downloading, onDownload }: {
  files: DocumentoArquivoRow[];
  downloading: boolean;
  onDownload: (file: DocumentoArquivoRow) => void;
}) {
  return (
    <Collapsible className="overflow-hidden rounded-xl border border-osg-200/70 bg-white/70">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-osg-50/60 [&[data-state=open]_.chevron]:rotate-180">
        <Archive className="h-4 w-4 text-osg-500" />
        <span className="flex-1 text-sm font-semibold text-osg-700">Outros documentos do cliente</span>
        <span className="text-xs tabular-nums text-osg-500">{files.length}</span>
        <ChevronDown className="chevron h-4 w-4 text-osg-400 transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-osg-100 px-4 py-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => onDownload(file)}
              disabled={!file.gcs_uri || downloading}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-osg-100 bg-osg-50/50 px-3 py-2 text-left hover:bg-osg-50 disabled:opacity-60"
            >
              <FileText className="h-4 w-4 shrink-0 text-osg-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-slate-600">{file.nome_original}</span>
                <span className="block truncate text-[10px] text-slate-400">{CAT_LABEL[file.categoria]}</span>
              </span>
              <Download className="h-3.5 w-3.5 shrink-0 text-osg-400" />
            </button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ChecklistSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando checklist de planejamento tributário">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="space-y-3 rounded-2xl border border-osg-100 bg-white p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export default DocumentosClienteChecklist;
