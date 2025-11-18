import { TextField } from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";

/**
 * Props for the text input component
 */
interface NumberInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  label?: string;
  error?: boolean;
}

/**
 * An input for numbers
 *
 * @param props {@link NumberInputProps}
 * @returns An input that only returns whole number values
 */
export default function NumberInput(props: NumberInputProps) {
  const { value, onChange, error, label } = props;
  const [displayValue, setDisplayValue] = useState<string>(
    value === null || value === undefined ? "" : String(value)
  );

  useEffect(() => {
    const propValueString =
      value === null || value === undefined ? "" : String(value);
    if (displayValue.endsWith(".") || displayValue === "-") {
      return;
    }
    if (propValueString !== displayValue) {
      setDisplayValue(propValueString);
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const stringValue = e.target.value;
    const validNumberRegex = /^-?\d*\.?\d*$/;

    if (validNumberRegex.test(stringValue) || stringValue === "") {
      setDisplayValue(stringValue);
      if (onChange) {
        if (stringValue === "" || stringValue === "-") {
          onChange(null);
        } else {
          const num = parseFloat(stringValue);
          if (!isNaN(num)) {
            onChange(num);
          }
        }
      }
    }
  };

  const onBlur = () => {
    if (onChange) {
      const num = Math.round(Number(displayValue));
      if (isNaN(num) || displayValue.trim() === "") {
        onChange(null);
      } else {
        onChange(num);
      }
    }
  };

  return (
    <TextField
      type="text"
      inputMode="decimal"
      value={displayValue}
      label={label}
      onChange={handleChange}
      onBlur={onBlur}
      error={error}
      size="small"
      sx={{
        minWidth: 100,
        "& legend": {
          transition: "unset",
        },
      }}
    />
  );
}
