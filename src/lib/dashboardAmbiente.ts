import { useState } from 'react';
import { currentAmbiente, isLocalEnvironment, type Ambiente } from '@/config/api';

/**
 * Ambiente do dashboard nativo, com override APENAS em localhost.
 *
 * Por quê: há um só banco Supabase; "dev/prod" é apenas o valor da coluna
 * `ambiente` em `cliente`. Rodando `bun run dev` (localhost), `currentAmbiente`
 * é 'dev' e a base dev é quase vazia (clientes-teste sem OS/tarefas). Para
 * validar o dashboard contra os dados reais do Looker SEM publicar, permitimos
 * forçar 'prod' localmente. É só leitura (o dashboard não escreve nada) e o
 * override é bloqueado fora do ambiente local — no publicado vale sempre o
 * `currentAmbiente` do hostname.
 */
export function useDashboardAmbiente(): {
  ambiente: Ambiente;
  setAmbiente: (a: Ambiente) => void;
  canOverride: boolean;
} {
  const canOverride = isLocalEnvironment;
  // Em localhost, default = 'prod' (preview fiel do dashboard publicado).
  const [ambiente, setAmbiente] = useState<Ambiente>(canOverride ? 'prod' : currentAmbiente);
  return {
    ambiente: canOverride ? ambiente : currentAmbiente,
    setAmbiente: canOverride ? setAmbiente : () => {},
    canOverride,
  };
}
