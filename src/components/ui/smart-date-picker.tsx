import React from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale/pt-BR";
import { cn } from "@/lib/utils";
import "./smart-date-picker.css";

registerLocale("pt-BR", ptBR);

interface SmartDatePickerBaseProps {
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

interface DayModeProps extends SmartDatePickerBaseProps {
  mode: "day";
  selected: Date | null;
  onChange: (date: Date | null) => void;
  startDate?: never;
  endDate?: never;
}

interface MonthModeProps extends SmartDatePickerBaseProps {
  mode: "month";
  selected: Date | null;
  onChange: (date: Date | null) => void;
  startDate?: never;
  endDate?: never;
}

interface RangeModeProps extends SmartDatePickerBaseProps {
  mode: "range";
  selected?: never;
  onChange: (dates: [Date | null, Date | null]) => void;
  startDate: Date | null;
  endDate: Date | null;
}

type SmartDatePickerProps = DayModeProps | MonthModeProps | RangeModeProps;

const SmartDatePicker: React.FC<SmartDatePickerProps> = (props) => {
  const { mode, placeholder = "Selecione", className, disabled } = props;

  const commonProps = {
    locale: "pt-BR" as string,
    placeholderText: placeholder,
    disabled,
    popperClassName: "z-[100]",
    autoComplete: "off",
  };

  return (
    <div className={cn("custom-datepicker-wrapper flex flex-col w-full", className)}>
      {mode === "day" && (
        <DatePicker
          {...commonProps}
          selected={props.selected}
          onChange={(date) => props.onChange(date)}
          dateFormat="dd/MM/yyyy"
        />
      )}
      {mode === "month" && (
        <DatePicker
          {...commonProps}
          selected={props.selected}
          onChange={(date) => props.onChange(date)}
          showMonthYearPicker
          dateFormat="MM/yyyy"
        />
      )}
      {mode === "range" && (
        <DatePicker
          {...commonProps}
          selectsRange
          startDate={props.startDate ?? undefined}
          endDate={props.endDate ?? undefined}
          onChange={(dates) => props.onChange(dates as [Date | null, Date | null])}
          dateFormat="dd/MM/yyyy"
        />
      )}
    </div>
  );
};

export default SmartDatePicker;
