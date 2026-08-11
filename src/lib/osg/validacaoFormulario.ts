// Falha de validação nos modais do OSG: um caminho só.
//
// O sintoma era "o botão não funcionou": salvar um bem sem titular trocava de
// aba, deixava um asterisco no campo e nada mais. Cada modal repetia o par
// `setActiveTab(...)` + `toast.error(...)` (às vezes só um dos dois) e nenhum
// levava o foco ao campo que falta.
//
// Aqui a falha vira dado — mensagem, aba e campo — e um único reportador faz as
// três coisas na ordem certa: avisa o que falta, abre a aba onde o campo mora e
// põe o foco (com scroll) no campo. Mesma divisão de responsabilidade que
// `src/lib/camposObrigatorios.ts` já usa no cadastro de cliente: a regra diz o
// QUE falta, o utilitário diz ONDE está.
//
// O campo é localizado por `data-campo="<nome>"` no bloco do formulário — não
// por id — porque os controles do design system (Select, CurrencyInput) não
// expõem o elemento focável.
import { toast } from 'sonner';

export interface FalhaValidacao {
  /** Frase que nomeia o que falta (e a aba, quando o campo não está à vista). */
  mensagem: string;
  /** Aba que precisa estar aberta para o campo aparecer. */
  aba?: string;
  /** Valor do `data-campo` do bloco que deve receber o foco. */
  campo?: string;
}

export interface RegraValidacao extends FalhaValidacao {
  /** `true` quando a regra falhou. */
  invalido: boolean;
}

export interface OpcoesValidacao {
  /** Como o modal troca de aba (normalmente o `setActiveTab` dele). */
  abrirAba?: (aba: string) => void;
}

const FOCAVEIS = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';

/** A primeira regra que falhou, na ordem em que o formulário as declara. */
export function primeiraFalha(regras: RegraValidacao[]): FalhaValidacao | null {
  const regra = regras.find((r) => r.invalido);
  if (!regra) return null;
  return { mensagem: regra.mensagem, aba: regra.aba, campo: regra.campo };
}

/** Põe o foco (e o olho) no campo marcado com `data-campo`. */
export function focarCampo(campo: string): boolean {
  if (typeof document === 'undefined') return false;
  const bloco = document.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
  if (!bloco) return false;
  const focavel = bloco.matches(FOCAVEIS) ? bloco : bloco.querySelector<HTMLElement>(FOCAVEIS);
  (focavel ?? bloco).focus?.();
  // jsdom não implementa scrollIntoView; a chamada opcional mantém os testes limpos.
  bloco.scrollIntoView?.({ block: 'center' });
  return true;
}

/** Avisa o que falta, abre a aba certa e leva o foco ao campo. */
export function reportarFalhaValidacao(falha: FalhaValidacao, opcoes: OpcoesValidacao = {}): void {
  toast.error(falha.mensagem);
  if (falha.aba) opcoes.abrirAba?.(falha.aba);
  const campo = falha.campo;
  if (!campo) return;
  // Depois da troca de aba: o campo só existe no DOM quando o painel dele monta.
  const focar = () => focarCampo(campo);
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focar);
  else setTimeout(focar, 0);
}

/**
 * Valida na ordem declarada e, na primeira falha, avisa/troca de aba/foca.
 * Devolve `true` quando o formulário pode seguir para a gravação.
 */
export function validarFormulario(regras: RegraValidacao[], opcoes: OpcoesValidacao = {}): boolean {
  const falha = primeiraFalha(regras);
  if (!falha) return true;
  reportarFalhaValidacao(falha, opcoes);
  return false;
}
