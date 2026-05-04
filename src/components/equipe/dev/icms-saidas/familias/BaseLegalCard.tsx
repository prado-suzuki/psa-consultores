import { Fragment, type ReactNode } from 'react';
import { Scale } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

/** Renderiza `**negrito**` sem dangerouslySetInnerHTML, igual ao DevPageHeader. */
const renderBoldSegments = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={index} className="font-semibold">
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });

/**
 * Texto da base legal por família, extraído do WP_ICMS_SAIDAS.xlsb (T03.1).
 * Pode ser texto multi-linha (\n separa parágrafos) com `**negrito**` opcional.
 *
 * Famílias sem base legal no WP retornam `null` → o componente não renderiza.
 */
const BASE_LEGAL: Partial<Record<FamiliaSaida, string>> = {
  acucar: [
    '**1.** Benefício de Crédito Outorgado **PRODEIC** — Resolução **CONDEPRODEMAT nº 32/2019** — Operações com Açúcar',
    '» Condicionado à contribuição dos Fundos: **FUNDES 6%; FUNDED 1%**',
    '» Fruição do benefício implica a vedação de acumular com qualquer outro benefício em relação a determinada operação cfe **art. 47-A** e **Parágrafo Único do Decreto 288/2019**',
    '**RICMS/MT, Art. 95, Inciso II** — Alíquota de **12%** para operações interestadual com Açúcar',
  ].join('\n'),

  etanol_interestado: [
    '**Resolução CONDEPRODEMAT nº 186/2020** — Operações interestaduais com Etanol (Anidro/Hidratado)',
    '» Crédito Outorgado: **73,3333%** ou alternativa de **R$ 0,21 por litro**',
    '» Condicionado à contribuição dos Fundos: **FUNDEIC 1%; FUNDED 1%**',
    '**RICMS/MT, Art. 95** — Alíquota de **12%** para operações interestaduais',
  ].join('\n'),

  // Pendente — preencher com texto da planilha
  etanol_interno: '',
  biodiesel: '',
};

interface BaseLegalCardProps {
  familia: FamiliaSaida;
}

export const BaseLegalCard = ({ familia }: BaseLegalCardProps) => {
  const text = BASE_LEGAL[familia];
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <Alert className="mb-6 bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800">
      <Scale className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
      <AlertTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Base Legal
      </AlertTitle>
      <AlertDescription className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mt-1 space-y-1">
        {lines.map((line, idx) => (
          <p key={idx}>{renderBoldSegments(line)}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
};
