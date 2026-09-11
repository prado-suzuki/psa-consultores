import {
  Bot,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Users,
} from 'lucide-react';

import { AREAS } from '@/lib/nomeDaArea';

/**
 * As seções do Controle de Acessos — o menu da barra lateral daquela tela.
 *
 * Elas eram sete `TabsTrigger` numa fila só, que estourava a largura em tela
 * média. Viraram menu em 10/09/2026, quando a tela ganhou barra própria: até
 * ali era a única tela de dentro do sistema sem barra nenhuma, e por isso a
 * única sem o cartão do usuário.
 *
 * O ACOPLAMENTO QUE ESTA LISTA CRIA. Cada `id` daqui é também o `value` de um
 * `<TabsContent>` na página. Renomear um lado sem o outro não quebra o build e
 * não quebra o typecheck: a seção simplesmente abre VAZIA, com a barra acesa no
 * item certo. É por isso que `secoesDeAcessos.test.ts` lê o fonte da página e
 * confere os sete pares — é o único lugar onde a divergência aparece.
 */

export interface SecaoDeAcessos {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SECOES_DE_ACESSOS = [
  { id: 'pages', label: 'Páginas', icon: FileText },
  { id: 'cadastros', label: 'Cadastros Estrutura', icon: Building2 },
  { id: 'users', label: 'Usuários Estrutura', icon: Users },
  { id: 'cadastros_clientes', label: 'Cadastros Clientes', icon: Users },
  { id: 'cadastro_categorias', label: 'Produtos & Serviços', icon: FolderKanban },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'agente', label: 'Agente', icon: Bot },
] as const satisfies readonly SecaoDeAcessos[];

export type IdDeSecaoDeAcessos = (typeof SECOES_DE_ACESSOS)[number]['id'];

/** A primeira seção, que é a que abre. */
export const SECAO_INICIAL: IdDeSecaoDeAcessos = SECOES_DE_ACESSOS[0].id;

/**
 * O rótulo de uma seção, para o título da página.
 *
 * O fallback é o nome da área e não uma string vazia: título vazio deixaria o
 * cabeçalho sem nada, que é pior do que um título genérico.
 */
export function rotuloDaSecao(id: IdDeSecaoDeAcessos): string {
  return SECOES_DE_ACESSOS.find((secao) => secao.id === id)?.label ?? AREAS.acessos.nome;
}
