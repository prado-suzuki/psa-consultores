import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBRLInput, centsToValue, valueToCents } from "./constants";

interface CurrencyFieldProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}

const CurrencyField = ({ value, onChange, className }: CurrencyFieldProps) => {
  const [cents, setCents] = useState(valueToCents(value));

  useEffect(() => {
    setCents(valueToCents(value));
  }, [value]);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const newCents = parseInt(digits || "0", 10);
    setCents(newCents);
    onChange(centsToValue(newCents));
  };

  return (
    <Input
      value={formatBRLInput(centsToValue(cents))}
      onChange={(e) => handleChange(e.target.value)}
      className={cn("h-8", className)}
      inputMode="numeric"
    />
  );
};

export default CurrencyField;
