import * as React from "react";

import { Input } from "@/components/ui/input";

// Input de valor monetário BR (R$). O estado externo é uma string numérica
// com ponto como separador decimal (ex.: "1234.56" ou ""), compatível com
// Number() e com o código de save existente dos modais OSG. A exibição usa
// formato BR ("1.234,56"), e a entrada é "centavos-da-direita": o usuário
// digita só dígitos, a vírgula desliza da direita pra esquerda. Backspace
// remove o último dígito. Paste aceita formatos diversos
// (1.234,56 / 1234.56 / 1234) e normaliza.

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  onChange: (raw: string) => void;
};

function formatCents(cents: number): string {
  const reais = Math.floor(cents / 100);
  const c = cents % 100;
  const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${reaisStr},${c.toString().padStart(2, "0")}`;
}

function rawToCents(raw: string): number {
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function centsToRaw(cents: number): string {
  if (cents === 0) return "";
  return (cents / 100).toFixed(2);
}

// Parsea texto colado (ou pré-preenchido) tentando interpretar BR ou EN.
// Se houver vírgula e ponto, assume BR (ponto=milhar, vírgula=decimal).
// Se houver só um separador, considera decimal se vier seguido de 1–2 dígitos.
function parseCurrencyToCents(input: string): number {
  if (!input) return 0;
  const s = input.replace(/[^\d,.]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const lastSep = Math.max(lastComma, lastDot);
  if (lastSep === -1) {
    return Math.round(Number(s) * 100);
  }
  const decimalPart = s.slice(lastSep + 1);
  const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
  if (decimalPart.length === 1 || decimalPart.length === 2) {
    const reais = Number(intPart || "0");
    const cents = Number(decimalPart.padEnd(2, "0"));
    return reais * 100 + cents;
  }
  return Number((intPart + decimalPart).replace(/[.,]/g, "")) * 100;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, onPaste, placeholder, ...rest }, ref) => {
    const cents = rawToCents(value);
    const display = cents === 0 ? "" : formatCents(cents);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, "");
      if (!digits) {
        onChange("");
        return;
      }
      const newCents = parseInt(digits.slice(0, 15), 10);
      onChange(centsToRaw(newCents));
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = e.clipboardData.getData("text");
      if (pasted) {
        e.preventDefault();
        const newCents = parseCurrencyToCents(pasted);
        onChange(centsToRaw(newCents));
      }
      onPaste?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder ?? "0,00"}
        {...rest}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
