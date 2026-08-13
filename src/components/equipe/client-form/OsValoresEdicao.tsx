// Campos da seção "Valores" da OS (edição).
//
// Saiu de `ContratosTab.tsx` quando o parcelamento entrou: o arquivo estava a
// 14 linhas do teto de 600 do AGENTS.md, e esta seção deixou de ser três campos
// soltos para virar um bloco com regra própria — o valor da parcela é derivado
// dos outros e conferido contra a planilha do financeiro na hora do cadastro.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import CurrencyField from "./CurrencyField";
import { formatBRLInput } from "./constants";
import { calcularValorParcela, entradaExcedeProjeto, parseNumeroParcelas } from "@/lib/osParcelamento";
import type { DraftOrdemServico } from "@/types/clientForm";

export interface OsValoresEdicaoProps {
  contrato: DraftOrdemServico;
  /** Grava direto na OS do formulário, como o resto da aba. */
  onChange: (patch: Partial<DraftOrdemServico>) => void;
}

const LABEL = "text-xs font-semibold uppercase text-muted-foreground";

export default function OsValoresEdicao({ contrato, onChange }: OsValoresEdicaoProps) {
  const valorParcela = calcularValorParcela({
    valorProjeto: contrato.valor_projeto,
    valorEntrada: contrato.valor_entrada,
    numeroParcelas: contrato.numero_parcelas,
  });
  const entradaAcimaDoTotal = entradaExcedeProjeto({
    valorProjeto: contrato.valor_projeto,
    valorEntrada: contrato.valor_entrada,
  });

  return (
    <div className="space-y-4">
      {/* O contrato numa faixa só, na ordem em que a conta é lida: total,
          parcelas, entrada e, no fim, a parcela derivada. Os reembolsos ficam
          fora dela — não entram no parcelamento e só faziam volume aqui. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
        <div>
          <Label className={LABEL}>Valor do Projeto (R$)</Label>
          <div className="mt-1">
            <CurrencyField value={contrato.valor_projeto || 0} onChange={(v) => onChange({ valor_projeto: v })} />
          </div>
          {/* O campo já guardou valor de parcela em OS antigas (Agro Amazônia,
              Paiol). A frase existe para não repetir a confusão. */}
          <p className="mt-1 text-[11px] text-muted-foreground">Total do contrato, não a parcela.</p>
        </div>

        <div>
          <Label className={LABEL}>Nº de Parcelas</Label>
          <div className="mt-1">
            <Input
              value={contrato.numero_parcelas != null ? String(contrato.numero_parcelas) : ""}
              onChange={(e) => onChange({ numero_parcelas: parseNumeroParcelas(e.target.value) })}
              className="h-8"
              inputMode="numeric"
              placeholder="1"
              aria-label="Número de parcelas"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">1 = pagamento único. Mensal.</p>
        </div>

        <div>
          <Label className={LABEL}>Entrada (R$)</Label>
          <div className="mt-1">
            <CurrencyField value={contrato.valor_entrada || 0} onChange={(v) => onChange({ valor_entrada: v })} />
          </div>
          <p className={cn("mt-1 text-[11px]", entradaAcimaDoTotal ? "font-medium text-destructive" : "text-muted-foreground")}>
            {entradaAcimaDoTotal ? "Entrada maior que o valor do projeto." : "0 quando não houver."}
          </p>
        </div>

        <div>
          <Label className={LABEL}>Valor da Parcela</Label>
          {/* Derivado: não é digitado nem gravado. Fica ao lado dos três campos
              que o produzem, para conferência contra a planilha. */}
          <div className="mt-1">
            <Input
              value={valorParcela != null ? formatBRLInput(valorParcela) : "—"}
              readOnly
              disabled
              className="h-8 cursor-not-allowed bg-muted/60 font-semibold"
              title="Calculado: (Valor do Projeto − Entrada) ÷ Nº de Parcelas. Não é gravado."
              aria-label="Valor da parcela (calculado)"
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">(Projeto − Entrada) ÷ Parcelas</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Reembolsos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:min-w-0">
          <div>
            <Label className={LABEL}>Reembolso por KM (R$)</Label>
            <div className="mt-1">
              <CurrencyField value={contrato.valor_reembolso_km || 0} onChange={(v) => onChange({ valor_reembolso_km: v })} />
            </div>
          </div>

          <div>
            <Label className={LABEL}>Reembolso Refeição (R$)</Label>
            <div className="mt-1">
              <CurrencyField value={contrato.valor_reembolso_refeicao || 0} onChange={(v) => onChange({ valor_reembolso_refeicao: v })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
