import type { AreaKey } from '@/config/areaCategories';
import { useProjetosCadastroController } from '@/hooks/useProjetosCadastroController';
import { ProjetoDeleteDialog } from '@/components/equipe/projetos-cadastro/ProjetoDeleteDialog';
import { ProjetoDialog } from '@/components/equipe/projetos-cadastro/ProjetoDialog';
import { ProjetosCadastroContext } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { ProjetosCadastroTable } from '@/components/equipe/projetos-cadastro/ProjetosCadastroTable';
import { ProjetosCadastroToolbar } from '@/components/equipe/projetos-cadastro/ProjetosCadastroToolbar';

export function ProjetosCadastroContent({ area = 'tax' as AreaKey }: { area?: AreaKey } = {}) {
  const controller = useProjetosCadastroController(area);
  return <ProjetosCadastroContext.Provider value={controller}>
    <div className="space-y-6"><ProjetosCadastroToolbar /><ProjetosCadastroTable /></div>
    <ProjetoDialog />
    <ProjetoDeleteDialog />
  </ProjetosCadastroContext.Provider>;
}
