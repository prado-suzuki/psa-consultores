import { FolderKanban } from 'lucide-react';
import { ProjetosLayout } from '@/components/equipe/projetos/ProjetosLayout';

const ProjetosDashboard = () => {
  return (
    <ProjetosLayout title="Dashboard" subtitle="Visão geral da área de Projetos">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <FolderKanban className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Área em desenvolvimento</p>
          <p className="text-sm mt-2">O conteúdo desta seção será adicionado em breve.</p>
        </div>
      </div>
    </ProjetosLayout>
  );
};

export default ProjetosDashboard;
