import { createContext, useContext } from 'react';
import type { ProjetosCadastroController } from '@/hooks/useProjetosCadastroController';

export const ProjetosCadastroContext = createContext<ProjetosCadastroController | null>(null);

export function useProjetosCadastro() {
  const context = useContext(ProjetosCadastroContext);
  if (!context) throw new Error('useProjetosCadastro deve ser usado dentro de ProjetosCadastroContext');
  return context;
}
