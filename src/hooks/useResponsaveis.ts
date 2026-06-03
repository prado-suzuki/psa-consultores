import { createEntityHooks } from './_createEntityHooks';
import type { Responsavel } from '@/types';
import { responsavelFromDb, responsavelToDb } from '@/utils/mapa/dbMappers';

const hooks = createEntityHooks<Responsavel>({
  resource: 'job_roles',
  defaultOrder: 'name',
  fromDb: responsavelFromDb,
  toDb: responsavelToDb,
});

export const useResponsaveis = hooks.useList;
export const useResponsavel = hooks.useById;
export const useCreateResponsavel = hooks.useCreate;
export const useUpdateResponsavel = hooks.useUpdate;
export const useDeleteResponsavel = hooks.useDelete;
