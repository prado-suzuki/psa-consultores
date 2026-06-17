// Grupo de processos arrastável (drag-and-drop) — padrão "Cadastro Puro".
// Reordena DENTRO de um mesmo projeto (a numeração Pn.NN é por-projeto), com
// animação fluida via framer-motion. O card inteiro é a alça de arraste (sem
// botão dedicado); a barra de acento da lateral esquerda já dá o "feel".
//
// A ordem visual é estado local controlado pelo Reorder: muda na hora ao
// arrastar (renumerando ao vivo) e só ressincroniza com as props quando o
// CONJUNTO de ids muda (adicionar/remover/trocar escopo) — assim um arraste
// em andamento nunca é atropelado pelo refetch.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Reorder } from 'framer-motion';
import type { Processo } from '@/types';

interface Props {
  /** Processos do grupo, já ordenados por order_index. */
  processos: Processo[];
  /** Prefixo do código do projeto (ex.: "P1") — null ⇒ "#NN" (sem projeto). */
  codePrefix: string | null;
  /** Persiste a nova ordem (index 0-based vira order_index). */
  onPersist: (ordered: { id: string; order_index: number }[]) => void;
  /** Render do item; recebe o código visual recomputado pela posição local. */
  renderItem: (p: Processo, codigo: string) => ReactNode;
}

const codigoNa = (prefix: string | null, i: number): string => {
  const nn = String(i + 1).padStart(2, '0');
  return prefix ? `${prefix}.${nn}` : `#${nn}`;
};

export default function ProcessoReorderGroup({ processos, codePrefix, onPersist, renderItem }: Props) {
  const [orderIds, setOrderIds] = useState<string[]>(() => processos.map(p => p.id));
  const byId = useMemo(() => new Map(processos.map(p => [p.id, p])), [processos]);
  // Assinatura do CONJUNTO (independente da ordem) — gatilho de ressincronização.
  const idsKey = useMemo(() => processos.map(p => p.id).slice().sort().join(','), [processos]);

  useEffect(() => {
    setOrderIds(prev => {
      const presentes = new Set(processos.map(p => p.id));
      const mantidos = prev.filter(id => presentes.has(id));
      const novos = processos.map(p => p.id).filter(id => !prev.includes(id));
      return [...mantidos, ...novos];
    });
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- só ao mudar o conjunto

  const orderRef = useRef(orderIds);
  orderRef.current = orderIds;

  // Guard do "clique fantasma": o pointerup pós-arraste dispara um click que
  // navegaria pro mapeamento. Enquanto ativo, engolimos esse click na captura.
  const dragGuard = useRef(false);

  const handleDragStart = () => { dragGuard.current = true; };
  const handleDragEnd = () => {
    onPersist(orderRef.current.map((id, i) => ({ id, order_index: i })));
    window.setTimeout(() => { dragGuard.current = false; }, 80);
  };

  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={orderIds}
      onReorder={setOrderIds}
      className="processo-reorder-group"
    >
      {orderIds.map((id, i) => {
        const p = byId.get(id);
        if (!p) return null;
        return (
          <Reorder.Item
            as="div"
            key={id}
            value={id}
            className="processo-reorder-item"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClickCapture={(e) => { if (dragGuard.current) { e.preventDefault(); e.stopPropagation(); } }}
            whileDrag={{ scale: 1.015, zIndex: 20, boxShadow: '0 18px 40px -20px rgba(15,23,42,0.45)' }}
            transition={{ type: 'spring', stiffness: 600, damping: 38 }}
          >
            {renderItem(p, codigoNa(codePrefix, i))}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
