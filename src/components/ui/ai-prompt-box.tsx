/**
 * Caixa de composição do Agente PSA.
 *
 * Adaptação da referência de design recebida (`ai-prompt-box`) para este repo,
 * com três desvios deliberados:
 *
 * 1. **Sem injeção de `<style>` no módulo.** A referência criava um elemento no
 *    `document.head` em tempo de import — quebra em teste (jsdom importa o
 *    módulo mil vezes) e duplica regra a cada HMR. O CSS vive no `index.css`,
 *    em `.agente-*`.
 * 2. **Sem microfone e sem anexo.** Não existe transcrição nem visão no
 *    caminho de dados do agente (`agente-psa` recebe TEXTO e o snapshot da
 *    tela). Botão que não faz nada é pior que botão ausente — quando entrar
 *    áudio/imagem, entra com o backend junto.
 * 3. **Os modos são dados, não hardcode.** A referência trazia
 *    Search/Think/Canvas fixos; aqui quem monta a lista é quem usa a caixa.
 *
 * Cores: tokens `--agente-*` do `index.css`. Estilo inline com token é o idioma
 * dos componentes do Board (ver `src/components/board/ui/BoardCard.tsx`), não
 * cor crua. O `BoardAIBox`, que este comentário citava, foi deletado em
 * 21/08/2026 — a análise de IA saiu da grade do Board e virou este painel.
 */
import * as React from 'react';
import { ArrowUp, Square, type LucideIcon } from 'lucide-react';

export interface ModoPrompt {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Cor do modo ativo. Token ou cor do próprio modo. */
  cor: string;
  descricao?: string;
}

interface PromptInputBoxProps {
  onSend: (mensagem: string, modo: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  modos?: ModoPrompt[];
  modo?: string;
  onModoChange?: (modo: string) => void;
  /** Altura máxima do textarea antes de rolar. */
  maxHeight?: number;
  className?: string;
}

export const PromptInputBox = React.forwardRef<HTMLTextAreaElement, PromptInputBoxProps>(
  function PromptInputBox(
    {
      onSend, onStop, isLoading = false, disabled = false,
      placeholder = 'Pergunte sobre os dados desta tela...',
      modos = [], modo, onModoChange, maxHeight = 160, className = '',
    },
    ref,
  ) {
    const [texto, setTexto] = React.useState('');
    const interno = React.useRef<HTMLTextAreaElement | null>(null);

    const aplicarRef = (el: HTMLTextAreaElement | null) => {
      interno.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    // Autosize: altura do conteúdo até o teto, depois rola.
    React.useEffect(() => {
      const el = interno.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    }, [texto, maxHeight]);

    const temTexto = texto.trim().length > 0;

    const enviar = () => {
      if (!temTexto || isLoading || disabled) return;
      onSend(texto.trim(), modo ?? modos[0]?.value ?? 'estrategia');
      setTexto('');
    };

    const aoTeclar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter envia, Shift+Enter quebra linha — convenção de chat.
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviar();
      }
    };

    return (
      <div className={`agente-composer ${isLoading ? 'is-loading' : ''} ${className}`}>
        <textarea
          ref={aplicarRef}
          className="agente-composer-ta"
          rows={1}
          value={texto}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={aoTeclar}
        />

        <div className="agente-composer-acoes">
          <div className="agente-modos">
            {modos.map((m) => {
              const ativo = m.value === modo;
              const Icone = m.icon;
              return (
                <button
                  key={m.value}
                  type="button"
                  title={m.descricao ?? m.label}
                  aria-pressed={ativo}
                  onClick={() => onModoChange?.(m.value)}
                  className="agente-modo"
                  style={ativo
                    ? { background: `${m.cor}26`, borderColor: m.cor, color: m.cor }
                    : undefined}
                >
                  <Icone style={{ width: 13, height: 13 }} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="agente-enviar"
            aria-label={isLoading ? 'Interromper' : 'Enviar pergunta'}
            title={isLoading ? 'Interromper' : 'Enviar (Enter)'}
            disabled={isLoading ? !onStop : !temTexto || disabled}
            data-pronto={temTexto && !isLoading ? 'sim' : 'nao'}
            onClick={() => (isLoading ? onStop?.() : enviar())}
          >
            {isLoading
              ? <Square style={{ width: 13, height: 13 }} />
              : <ArrowUp style={{ width: 15, height: 15 }} />}
          </button>
        </div>
      </div>
    );
  },
);
