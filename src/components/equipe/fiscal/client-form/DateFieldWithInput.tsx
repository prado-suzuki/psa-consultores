import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { parseDate } from "@/lib/dateUtils";
import { toast } from "sonner";
import { formatDateMask, parseDateMask } from "./constants";

const isoToMasked = (iso: string): string => {
  if (!iso) return "";
  try {
    const date = parseDate(iso);
    return format(date, "dd/MM/yyyy");
  } catch {
    return "";
  }
};

interface DateFieldWithInputProps {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
}

export const DateFieldWithInput = ({ value, onChange, label }: DateFieldWithInputProps) => {
  const [textValue, setTextValue] = useState(isoToMasked(value));

  useEffect(() => {
    setTextValue(isoToMasked(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = formatDateMask(raw);
    setTextValue(masked);
    const parsed = parseDateMask(masked);
    if (parsed) onChange(parsed);
  };

  const handleTextBlur = () => {
    if (textValue && textValue.replace(/\D/g, "").length === 8) {
      const parsed = parseDateMask(textValue);
      if (!parsed) {
        toast.error("Data inválida");
        setTextValue(isoToMasked(value));
      }
    } else if (textValue && textValue.replace(/\D/g, "").length > 0) {
      setTextValue(isoToMasked(value));
    }
  };

  return (
    <div className="flex items-center gap-1 max-w-[220px]">
      <Input
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleTextBlur}
        placeholder="DD/MM/AAAA"
        className="h-8 font-mono text-sm"
        maxLength={10}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="single"
            selected={value ? parseDate(value) : undefined}
            onSelect={(date) => {
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              }
            }}
            disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
