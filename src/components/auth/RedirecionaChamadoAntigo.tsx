import { Navigate, useParams } from 'react-router-dom';

/**
 * Redireciona o detalhe de chamado do endereço antigo para o novo.
 *
 * `<Navigate to="...">` não interpola parâmetro de rota: mandaria a pessoa para
 * um caminho com o texto ":id" literal. Por isso este componente lê o parâmetro
 * e monta o destino.
 *
 * Existe só para link salvo e notificação antiga. Quem não for líder+ é barrado
 * no destino pelo `LiderRoute`, que é o comportamento correto — a tela passou a
 * ser da Gerencial.
 */
export const RedirecionaChamadoAntigo = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/equipe/tax/gerencial/chamados/${id ?? ''}`} replace />;
};

export default RedirecionaChamadoAntigo;
