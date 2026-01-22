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

interface UseEFDOverviewParams {
  enabled?: boolean;
  contribuinteId?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useEFDOverview(params?: UseEFDOverviewParams) {
  return useQuery({
    queryKey: ['efd-overview', params?.contribuinteId, params?.dataInicio, params?.dataFim],
    queryFn: () => fetchStorageJson<EFDOverview>('EFD_CONTRIBUICOES_N1.json'),
    enabled: params?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
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
