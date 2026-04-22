import { Link } from 'react-router-dom';
import { usePageAccess } from '@/hooks/usePageAccess';
import { ShieldCheck, ArrowRight } from 'lucide-react';

/**
 * Banner-atalho para a página completa de gerenciamento de acessos
 * (/equipe/acessos). Aparece apenas para quem tem visibilidade da rota.
 */
export const ManageAccessLink = () => {
  const { hasAccess } = usePageAccess('/equipe/acessos');

  if (!hasAccess) return null;

  return (
    <Link
      to="/equipe/acessos"
      className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800 transition-colors hover:bg-teal-100"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 text-teal-600" aria-hidden="true" />
        <div>
          <p className="font-medium">Gerenciamento completo de acessos</p>
          <p className="text-xs text-teal-700/80">
            Criar usuários, editar papéis, atribuir páginas e gerenciar estrutura.
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 flex-shrink-0 text-teal-600" aria-hidden="true" />
    </Link>
  );
};
