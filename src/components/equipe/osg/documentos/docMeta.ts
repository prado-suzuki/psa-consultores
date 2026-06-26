// Metadados compartilhados dos documentos OSG: rótulos de categoria, limites de
// upload e formatação. Nasceram na DocumentosTab e foram extraídos aqui para que a
// aba (nos modais) e a tela central "Documentos do Cliente" usem a mesma fonte.
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
