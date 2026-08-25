/**
 * Os três modos do agente. São dados, não `if` espalhado: o compositor
 * (`ui/ai-prompt-box`) só recebe a lista, e a edge function recebe o `value` —
 * cada modo troca as REGRAS do prompt, não o modelo nem os dados.
 *
 * Por que exatamente três:
 *  - `dados`      leitura fiel, sem opinião. É o modo de quem vai citar o
 *                 número numa reunião e não quer nada em volta dele.
 *  - `estrategia` cruza blocos e devolve a implicação em decisão. O padrão.
 *  - `aprender`   o usuário corrige. O texto vira lição e volta em todo
 *                 prompt seguinte daquele escopo (`agente_aprendizados`).
 */
import { Database, Compass, GraduationCap } from 'lucide-react';
import type { ModoPrompt } from '@/components/ui/ai-prompt-box';
import type { ModoAgente } from '@/hooks/useDomainAgentePsa';

export const MODOS_AGENTE: (ModoPrompt & { value: ModoAgente })[] = [
  {
    value: 'dados',
    label: 'Dados',
    icon: Database,
    cor: 'var(--agente-go)',
    descricao: 'Só o número da tela, com a janela e a nota que o qualificam. Sem recomendação.',
  },
  {
    value: 'estrategia',
    label: 'Estratégia',
    icon: Compass,
    cor: 'var(--agente-accent)',
    descricao: 'Cruza os blocos da tela e diz o que isso implica em decisão.',
  },
  {
    value: 'aprender',
    label: 'Corrigir',
    icon: GraduationCap,
    cor: 'var(--agente-warn)',
    descricao: 'Ensine a regra certa. Vira lição e volta em toda resposta desta tela.',
  },
];

export const MODO_PADRAO: ModoAgente = 'estrategia';
