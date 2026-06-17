// Confirmação genérica de exclusão das páginas de cadastro. Gerencia o estado
// "excluindo" e o toast de erro internamente; o chamador faz a mutação (e o
// toast de sucesso) dentro de `onConfirm`.

import { useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';

interface Props {
  aberto: boolean;
  /** Nome do registro exibido em destaque na pergunta. */
  nomeItem: string;
  /** Substantivo no singular (ex.: "gargalo"). */
  substantivo: string;
  /** Aviso opcional sobre efeitos colaterais da exclusão (ex.: cascata). */
  aviso?: ReactNode;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function ConfirmDeleteModal({ aberto, nomeItem, substantivo, aviso, onConfirm, onClose }: Props) {
  const [excluindo, setExcluindo] = useState(false);

  const handleConfirm = async () => {
    setExcluindo(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      toast.error('Erro ao excluir', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <Modal isOpen={aberto} onClose={onClose}>
      <div className="modal">
        <h2>Excluir {substantivo}</h2>
        <p>
          Tem certeza que deseja excluir <strong>{nomeItem}</strong>?{aviso ? ' ' : ''}
          {aviso}{aviso ? ' ' : ''}Esta ação não pode ser desfeita.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={excluindo}>Cancelar</button>
          <button
            className="btn-save"
            style={{ background: '#b91c1c' }}
            disabled={excluindo}
            onClick={handleConfirm}
          >
            {excluindo ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
