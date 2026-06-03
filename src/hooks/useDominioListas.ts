// Hooks de listagem das entidades do MAPA. Substituem os antigos
// `fetchX()` que viviam em `src/data/fetchers.ts` — pages não fazem mais
// `Promise.all([fetchX(), fetchY()])`; agora compõem `useX()` e `useY()`
// e recebem os arrays prontos via React Query.

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  Projeto, Processo, Etapa, Responsavel, Sistema, Gargalo,
  Melhoria, Documento,
} from '@/types';
import {
  projetoFromDb, processoFromDb, etapaFromDb, responsavelFromDb, melhoriaFromDb,
} from '@/utils/mapa/dbMappers';

type DbRow = Record<string, unknown>;

async function listMapped<T>(table: string, mapper: (r: DbRow) => T): Promise<T[]> {
  const { data, error } = await supabase.from(table as never).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return ((data ?? []) as unknown[]).map(r => mapper(r as DbRow));
}

async function listAll<T>(table: string): Promise<T[]> {
  const { data, error } = await supabase.from(table as never).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as unknown as T[];
}

// ── Listas das tabelas reaproveitadas (schema EN — usa mappers) ────────
export const useProjetosLista = (): UseQueryResult<Projeto[]> =>
  useQuery<Projeto[]>({ queryKey: ['projects'], queryFn: () => listMapped<Projeto>('projects', r => projetoFromDb(r)) });

export const useProcessosLista = (): UseQueryResult<Processo[]> =>
  useQuery<Processo[]>({ queryKey: ['processes'], queryFn: () => listMapped<Processo>('processes', r => processoFromDb(r)) });

export const useEtapasLista = (): UseQueryResult<Etapa[]> =>
  useQuery<Etapa[]>({ queryKey: ['process_stages'], queryFn: () => listMapped<Etapa>('process_stages', r => etapaFromDb(r)) });

export const useResponsaveisLista = (): UseQueryResult<Responsavel[]> =>
  useQuery<Responsavel[]>({ queryKey: ['job_roles'], queryFn: () => listMapped<Responsavel>('job_roles', responsavelFromDb) });

export const useMelhoriasLista = (): UseQueryResult<Melhoria[]> =>
  useQuery<Melhoria[]>({ queryKey: ['process_improvements'], queryFn: () => listMapped<Melhoria>('process_improvements', r => melhoriaFromDb(r) as Melhoria) });

// ── Listas das tabelas nativas do MAPA (schema PT — sem mapper) ────────
export const useSistemasLista = (): UseQueryResult<Sistema[]> =>
  useQuery<Sistema[]>({ queryKey: ['sistemas_processo'], queryFn: () => listAll<Sistema>('sistemas_processo') });

export const useGargalosLista = (): UseQueryResult<Gargalo[]> =>
  useQuery<Gargalo[]>({ queryKey: ['gargalos'], queryFn: () => listAll<Gargalo>('gargalos') });

export const useDocumentosLista = (): UseQueryResult<Documento[]> =>
  useQuery<Documento[]>({ queryKey: ['documentos_processo'], queryFn: () => listAll<Documento>('documentos_processo') });

// ── Processo individual ────────────────────────────────────────────────
export function useProcessoUnico(id: string | undefined): UseQueryResult<Processo | null> {
  return useQuery<Processo | null>({
    queryKey: ['processes', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('processes' as never)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? processoFromDb(data as DbRow) : null;
    },
  });
}
