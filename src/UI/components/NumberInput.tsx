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
  min?: number;
  max?: number;
  fullWidth?: boolean;
}

/**
 * An input for numbers
 *
 * @param props {@link NumberInputProps}
 * @returns An input that only returns whole number values
 */
export default function NumberInput(props: NumberInputProps) {
  const { value, onChange, error, label, min, max, fullWidth } = props;
  const [displayValue, setDisplayValue] = useState<string>(
    value === null || value === undefined ? "" : String(value)
  );

  useEffect(() => {
    const propValueString =
      value === null || value === undefined ? "" : String(value);
    if (displayValue === "-" && value === null) {
      return;
    }
    if (propValueString !== displayValue) {
      setDisplayValue(propValueString);
    }
  }, [value, displayValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const stringValue = e.target.value;
    // Only allow digits and optionally a leading minus sign for negative numbers
    const validNumberRegex = /^-?\d*$/;

    if (validNumberRegex.test(stringValue) || stringValue === "") {
      setDisplayValue(stringValue);
      if (onChange) {
        if (stringValue === "" || stringValue === "-") {
          onChange(null);
        } else {
          const num = parseInt(stringValue, 10);
          if (!isNaN(num)) {
            // Apply max constraint during typing if provided
            if (max !== undefined && num > max) {
              setDisplayValue(String(max));
              onChange(max);
            } else {
              onChange(num);
            }
          }
        }
      }
    }
  };

  const onBlur = () => {
    if (onChange) {
      let num = Math.round(Number(displayValue));
      if (isNaN(num) || displayValue.trim() === "") {
        onChange(null);
        setDisplayValue("");
      } else {
        if (min !== undefined && num < min) {
          num = min;
        }
        if (max !== undefined && num > max) {
          num = max;
        }
        setDisplayValue(String(num));
        onChange(num);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent 'e', 'E', '+', '.', and other non-numeric keys
    if (
      e.key === "e" ||
      e.key === "E" ||
      e.key === "+" ||
      e.key === "." ||
      e.key === ","
    ) {
      e.preventDefault();
    }
  };

  return (
    <TextField
      type="text"
      fullWidth={fullWidth}
      slotProps={{ htmlInput: { inputMode: "numeric", pattern: "[0-9]*" } }}
      value={displayValue}
      label={label}
      onChange={handleChange}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
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
