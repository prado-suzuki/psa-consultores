import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EFDOverview, EFDDetail } from '@/types/efd';

// Buscar e parsear JSON do bucket project-documents
async function fetchStorageJson<T>(fileName: string): Promise<T> {
  const { data, error } = await supabase.storage
    .from('project-documents')
    .download(fileName);
  
  if (error) {
    throw new Error(`Erro ao baixar ${fileName}: ${error.message}`);
  }
  
  const text = await data.text();
  return JSON.parse(text) as T;
}

export function useEFDOverview() {
  return useQuery({
    queryKey: ['efd-overview'],
    queryFn: () => fetchStorageJson<EFDOverview>('EFD_CONTRIBUICOES_N1.json'),
    staleTime: 5 * 60 * 1000, // Cache 5 minutos
    retry: 2,
  });
}

export function useEFDDetail(idArquivo?: string, registro?: string) {
  return useQuery({
    queryKey: ['efd-detail', idArquivo, registro],
    queryFn: () => fetchStorageJson<EFDDetail>('EFD_CONTRIBUICOES_N2.json'),
    enabled: !!idArquivo && !!registro,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
