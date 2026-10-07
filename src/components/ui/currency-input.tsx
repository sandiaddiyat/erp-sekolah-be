import * as React from "react";
import { Input } from "@/components/ui/input";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (value: string) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, defaultValue, onChange, ...props }, ref) => {
    const formatValue = (val: string | number | readonly string[] | undefined) => {
      if (val === undefined || val === null || val === "") return "";
      const num = String(val).replace(/[^\d]/g, "");
      if (!num) return "";
      return new Intl.NumberFormat("id-ID").format(Number(num));
    };

    const [displayValue, setDisplayValue] = React.useState(formatValue(defaultValue));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      const formatted = raw ? new Intl.NumberFormat("id-ID").format(Number(raw)) : "";
      setDisplayValue(formatted);
      if (onChange) {
        onChange(raw);
      }
    };

    return (
      <Input
        type="text"
        inputMode="numeric"
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
