import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Modal com fade-in/out via framer-motion (entrada e saída).
 * A animação de scale do conteúdo continua sendo controlada pelo CSS
 * (`.modal` / `.modal-etapas` usam `animation: scaleIn`).
 */
export default function Modal({ isOpen, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className="modal-shell">
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
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
