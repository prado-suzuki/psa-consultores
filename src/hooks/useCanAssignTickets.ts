import { useAuth } from '@/contexts/AuthContext';

/**
 * Quem pode atribuir chamado a alguém.
 *
 * Decide duas coisas em `/equipe/chamados`: se a pessoa vê todos os chamados ao
 * alcance dela ou só os atribuídos a si, e se o seletor de responsável aparece.
 *
 * Antes isto era respondido perguntando se a pessoa tinha a página
 * `/gestao/chamados` liberada. Era um acoplamento silencioso: aposentar aquele
 * cadastro, ao mover a tela para o dropdown Gerencial, encolheria a lista dos
 * analistas e faria o seletor sumir, sem nenhuma relação aparente com a causa.
 *
 * A regra real é de papel — quem atribui chamado é liderança — então é assim que
 * ela fica escrita. Some a consulta ao banco e a capacidade deixa de depender de
 * um cadastro de página existir.
 *
 * `isLider` é estrito no AuthContext (não engloba admin), daí o OR explícito.
 */
export function useCanAssignTickets() {
  const { isAdmin, isLider } = useAuth();
  return isAdmin || isLider;
}
