import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useMapaTour } from '@/components/equipe/mapa/tour/useMapaTour';
import { isTourSeen, markTourSeen } from '@/components/equipe/mapa/tour/tourStorage';
import type { TourId } from '@/components/equipe/mapa/tour/tours';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Tour próprio do modal: mostra um "?" pulsante e auto-abre na 1ª vez que o modal abre. */
  tourId?: TourId;
}

/**
 * Modal com fade-in/out via framer-motion (entrada e saída).
 * A animação de scale do conteúdo continua sendo controlada pelo CSS
 * (`.modal` / `.modal-etapas` usam `animation: scaleIn`).
 *
 * Quando `tourId` é informado, o modal ganha um botão "?" (canto superior) e
 * auto-abre o tour daquele modal na primeira vez que é aberto. O tour fica
 * acima do overlay do modal (z-index do Joyride > z-index do modal-overlay).
 */
export default function Modal({ isOpen, onClose, children, tourId }: ModalProps) {
  const { startTour } = useMapaTour();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Auto-abre o tour do modal na 1ª vez que ele abre (marca como visto na
  // abertura → só auto-abre uma vez). O atraso cobre a animação de entrada.
  useEffect(() => {
    if (!isOpen || !tourId || isTourSeen(tourId)) return;
    const timer = window.setTimeout(() => {
      markTourSeen(tourId);
      startTour(tourId);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isOpen, tourId, startTour]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          // Clicar fora NÃO fecha — evita fechamento acidental com perda de dados.
          // O fechamento é só pelo botão "Sair", pelo Esc, ou pelas ações do modal.
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="modal-shell">
            <div className="modal-toolbar">
              {tourId && (
                <button
                  type="button"
                  className="mapa-tour-trigger modal-tour-trigger"
                  data-tour="modal-help"
                  onClick={() => startTour(tourId)}
                  aria-label="Ver tour deste modal"
                  title="Ver tour deste modal"
                >
                  <HelpCircle size={18} strokeWidth={2} />
                </button>
              )}
              <button
                type="button"
                className="modal-exit-button"
                onClick={onClose}
                aria-label="Sair do modal"
                title="Sair"
              >
                <span aria-hidden="true">×</span>
                <span>Sair</span>
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
