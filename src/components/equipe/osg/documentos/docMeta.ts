// Metadados compartilhados dos documentos OSG: rótulos de categoria, limites de
// upload e formatação. Nasceram na DocumentosTab e foram extraídos aqui para que a
// aba (nos modais) e a tela central "Documentos do Cliente" usem a mesma fonte.
import type { LucideIcon } from 'lucide-react';
import { File, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

export const CATEGORIAS: { value: DocCategoria; label: string }[] = [
  { value: 'bens_direitos', label: 'Bens e Direitos' },
  { value: 'cadastros_fiscais', label: 'Cadastros Fiscais' },
  { value: 'declaracao_ir', label: 'Declaração IR' },
  { value: 'agrarios', label: 'Agrários' },
  { value: 'georreferenciamento', label: 'Georreferenciamento' },
  { value: 'pessoais', label: 'Pessoais' },
  { value: 'societarios', label: 'Societários' },
  { value: 'sucessorios', label: 'Sucessórios' },
  { value: 'outros', label: 'Outros' },
];

export const categoriaLabel = (c: DocCategoria): string =>
  CATEGORIAS.find((x) => x.value === c)?.label ?? c;

// Allowlist e limite alinhados com o backend (sign-upload rejeita extensão fora
// da lista; 50 MB é um teto de cortesia checado no cliente antes do PUT).
export const MAX_BYTES = 50 * 1024 * 1024;
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

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
