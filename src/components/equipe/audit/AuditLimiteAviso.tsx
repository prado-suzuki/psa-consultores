import { AlertTriangle } from 'lucide-react';
import { LIMITE_LOGS_AUDITORIA } from '@/hooks/useDomainAuditLogs';

interface AuditLimiteAvisoProps {
  /** Quantos registros a consulta devolveu. */
  total: number;
}

/**
 * Aviso de série cortada.
 *
 * A consulta tem teto de linhas; num período longo o banco devolve só os mais
 * recentes. Sem este aviso, os números da tela pareceriam "o total do período"
 * quando são "o total dos últimos N registros" — e um período maior chegaria a
 * mostrar MENOS trabalho do que um menor, sem explicação.
 */
export const AuditLimiteAviso = ({ total }: AuditLimiteAvisoProps) => {
  if (total < LIMITE_LOGS_AUDITORIA) return null;

  return (
    <p className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-medium">Período grande demais para uma consulta.</strong> Os
        números acima cobrem apenas os {LIMITE_LOGS_AUDITORIA.toLocaleString('pt-BR')} registros
        mais recentes da janela escolhida — o começo dela ficou de fora. Para uma leitura completa,
        escolha um período menor.
      </span>
    </p>
  );
};
