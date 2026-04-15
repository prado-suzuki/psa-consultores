import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck, ArrowRight } from 'lucide-react';

/**
 * Banner-atalho para a página completa de gerenciamento de acessos
 * (/equipe/acessos). Aparece apenas para administradores nas páginas
 * de visualização (/administracao/acessos, /gestao/acessos), sinalizando
 * onde criar/editar/excluir usuários e atribuir páginas.
 *
 * As 3 rotas de acessos continuam existindo por compatibilidade com
 * bookmarks e menus; este banner apenas direciona o usuário ao destino
 * correto quando a ação desejada vai além de visualização.
 */
export const ManageAccessLink = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) return null;

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
