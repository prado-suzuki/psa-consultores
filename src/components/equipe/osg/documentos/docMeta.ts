// Metadados compartilhados dos documentos OSG: rótulos de categoria, limites de
// upload e formatação. Nasceram na DocumentosTab e foram extraídos aqui para que a
// aba (nos modais) e a tela central "Documentos do Cliente" usem a mesma fonte.
import type { LucideIcon } from 'lucide-react';
import { File, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

/**
 * A categoria da proposta comercial (ALE-8).
 *
 * ⚠️ TODO(EDU-13): trocar por `'proposta_comercial'` puro e APAGAR o cast quando a
 * migration que acrescenta o valor ao enum `osg_doc_categoria` for aplicada e o
 * `types.ts` regenerado.
 *
 * Conferido no banco de dev em 19/08/2026, não presumido: o enum tem 9 valores e
 * nenhum deles é este. Por isso o literal ainda não pertence à união
 * `DocCategoria`, e o `as unknown as` é necessário — o `as` direto o TypeScript
 * recusa, por serem literais sem sobreposição.
 *
 * O cast mora AQUI, num lugar só: é o único ponto do código que sabe da
 * pendência, e apagá-lo depois é uma linha. Fica neste módulo, e não no hook da
 * proposta, para a dependência apontar na direção certa — quem consome
 * metadados é o hook, não o contrário.
 *
 * ⚠️ QUANDO O ENUM ENTRAR, O BUILD QUEBRA EM DOIS LUGARES, e é de propósito: são
 * dois `Record<DocCategoria, …>` exaustivos, que existem justamente para forçar
 * uma decisão a cada valor novo. Não é defeito, é o alarme funcionando — e as
 * duas respostas já estão decididas, uma linha cada:
 *
 * - `src/lib/agrupadorDocumentos.ts` → `GRUPO_POR_CATEGORIA`: acrescentar
 *   `proposta_comercial: 'outros'`. A proposta nunca aparece nas gavetas da área
 *   do cliente (ela é `fonte = 'psa'`), então o grupo é só o destino formal.
 * - `src/components/equipe/osg/checklists/DocumentosClienteChecklist.tsx` →
 *   `CAT_LABEL`: acrescentar `proposta_comercial: 'Proposta Comercial'`, igual ao
 *   rótulo desta lista.
 *
 * Nenhum dos dois é risco de runtime: `grupoDaCategoria` já cai em 'outros' para
 * categoria fora do mapa. É só compilação.
 */
export const CATEGORIA_PROPOSTA = 'proposta_comercial' as unknown as DocCategoria;

export const CATEGORIAS: { value: DocCategoria; label: string }[] = [
  { value: 'bens_direitos', label: 'Bens e Direitos' },
  { value: 'cadastros_fiscais', label: 'Cadastros Fiscais' },
  { value: 'declaracao_ir', label: 'Declaração IR' },
  { value: 'agrarios', label: 'Agrários' },
  { value: 'georreferenciamento', label: 'Georreferenciamento' },
  { value: 'pessoais', label: 'Pessoais' },
  { value: 'societarios', label: 'Societários' },
  { value: 'sucessorios', label: 'Sucessórios' },
  // Entra antes da genérica para 'Outros' seguir sendo o último item da lista.
  //
  // EFEITO COLATERAL ASSUMIDO, conferido consumidor por consumidor em 19/08/2026
  // (e não deduzido da busca por nome, que dá falso positivo em quatro módulos
  // com `CATEGORIAS` próprio: EditorBlocoDialog, ChecklistPendentes, Novidades e
  // dashboardClientesOs/aggregations — outro domínio, sem relação):
  //
  // - DocUploadDialog.tsx:284 e DocumentosTab.tsx:80 ganham a opção nos seus
  //   seletores de categoria. É o que importa avisar na revisão: passa a ser
  //   possível classificar um documento qualquer como proposta por fora da aba.
  // - OrganizarDocumentos.tsx:237 exibe um grupo "Proposta Comercial" quando o
  //   cliente tem uma. Agrupa só o que existe, então é reflexo, não opção nova.
  //
  // NÃO afeta a gaveta do balde (classificarBalde.ts:75): a proposta nasce com
  // `triado_em`, então nunca entra no balde. Nem cria cabeçalho de grupo vazio no
  // seletor de tipo, porque `tiposPorCategoria` descarta grupo sem itens.
  { value: CATEGORIA_PROPOSTA, label: 'Proposta Comercial' },
  { value: 'outros', label: 'Outros' },
];

export const categoriaLabel = (c: DocCategoria): string =>
  CATEGORIAS.find((x) => x.value === c)?.label ?? c;

// Allowlist e limite alinhados com o backend (sign-upload rejeita extensão fora
// da lista; 50 MB é um teto de cortesia checado no cliente antes do PUT).
export const MAX_BYTES = 50 * 1024 * 1024;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

const ACCEPT_EXTS = ACCEPT.split(',').map((s) => s.trim().toLowerCase());

/** Extensão do arquivo está na allowlist do ACCEPT (mesma do sign-upload). */
export function extensaoValida(nome: string): boolean {
  const ext = '.' + (nome.split('.').pop() ?? '').toLowerCase();
  return ACCEPT_EXTS.includes(ext);
}

export function formatBytes(n: number | null): string {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

// Ícone + cor por tipo de arquivo (usa extensão do nome; mime como reforço).
const EXT_IMG = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
export function fileIconOf(nome: string, mime?: string | null): { Icon: LucideIcon; className: string } {
  const ext = (nome.split('.').pop() ?? '').toLowerCase();
  const m = (mime ?? '').toLowerCase();
  if (ext === 'pdf' || m.includes('pdf')) return { Icon: FileText, className: 'text-red-500' };
  if (EXT_IMG.includes(ext) || m.startsWith('image/')) return { Icon: ImageIcon, className: 'text-purple-500' };
  if (['xls', 'xlsx', 'csv'].includes(ext) || m.includes('sheet') || m.includes('excel') || m.includes('csv')) {
    return { Icon: FileSpreadsheet, className: 'text-emerald-600' };
  }
  if (['doc', 'docx'].includes(ext) || m.includes('word')) return { Icon: FileText, className: 'text-blue-500' };
  return { Icon: File, className: 'text-slate-400' };
}

// Pré-visualização: apenas imagem e PDF (decisão da OSG).
export const isImagem = (nome: string, mime?: string | null): boolean => {
  const ext = (nome.split('.').pop() ?? '').toLowerCase();
  return EXT_IMG.includes(ext) || (mime ?? '').toLowerCase().startsWith('image/');
};
export const isPreviavel = (nome: string, mime?: string | null): boolean => {
  const ext = (nome.split('.').pop() ?? '').toLowerCase();
  return ext === 'pdf' || (mime ?? '').toLowerCase().includes('pdf') || isImagem(nome, mime);
};
