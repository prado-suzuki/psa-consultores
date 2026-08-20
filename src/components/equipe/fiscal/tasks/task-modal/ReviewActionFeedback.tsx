import { motion } from 'framer-motion';
import { CheckCircle2, RotateCcw, Send, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ReviewOutcome } from '@/lib/orgTaskForm';

// Cada desfecho da revisão usa o papel de status correspondente (index.css):
// enviar para revisão = `revisao`, aprovar = `feito`, devolver = `ajuste`. Assim o
// overlay tem a cor da área, e não roxo/esmeralda/rosa de estoque.
const reviewFeedbackConfig = {
  send: {
    label: 'Enviado para revisão!',
    icon: Send,
    color: 'bg-status-revisao-soft text-status-revisao',
    dot: 'bg-status-revisao',
  },
  approved: {
    label: 'Revisão aprovada!',
    icon: CheckCircle2,
    color: 'bg-status-feito-soft text-status-feito',
    dot: 'bg-status-feito',
  },
  adjustments: {
    label: 'Ajustes solicitados!',
    icon: RotateCcw,
    color: 'bg-status-ajuste-soft text-status-ajuste',
    dot: 'bg-status-ajuste',
  },
} satisfies Record<ReviewOutcome, { label: string; icon: typeof Send; color: string; dot: string }>;

/** Overlay comemorativo exibido por ~700ms após uma ação de revisão. */
export function ReviewActionFeedback({ action }: { action: ReviewOutcome }) {
  const config = reviewFeedbackConfig[action];
  const Icon = config.icon;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="flex flex-col items-center rounded-2xl border bg-background px-8 py-6 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        <div className="relative">
          {[0, 1, 2, 3].map((index) => (
            <motion.span
              key={index}
              className={cn('absolute h-2 w-2 rounded-full', config.dot)}
              initial={{ opacity: 0, x: 20, y: 20 }}
              animate={{
                opacity: [0, 1, 0],
                x: Math.cos((index * Math.PI) / 2) * 42 + 20,
                y: Math.sin((index * Math.PI) / 2) * 42 + 20,
              }}
              transition={{ duration: 0.55, delay: 0.08 }}
            />
          ))}
          <motion.div
            initial={{ scale: 0.4, rotate: -18 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.04 }}
            className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-full',
              config.color,
            )}
          >
            <Icon className="h-7 w-7" />
            <Sparkles className="absolute -right-2 -top-2 h-4 w-4" />
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.16 }}
          className="mt-4 whitespace-nowrap text-sm font-semibold"
        >
          {config.label}
        </motion.p>
      </motion.div>
    </div>
  );
}
