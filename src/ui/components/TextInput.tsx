import { TextField } from "@mui/material";
import { ChangeEvent } from "react";

/**
 * Props for the text input component
 */
interface TextInputProps {
  label?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
}

/** 
 * An input for text
 *
 * @param props {@link TextInputProps}
 * @returns A multiline text input
 */
export default function TextInput(props: TextInputProps) {
  const { label, multiline, value, onChange, error } = props;

  const updateText = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (onChange) onChange(newValue);
  };

  return (
    <TextField
      variant="outlined"
      multiline={multiline ?? false}
      color="secondary"
      fullWidth
      label={label}
      onChange={updateText}
      value={value ?? ""}
      error={error}
      maxRows={5}
      slotProps={{ htmlInput: { maxLength: 75 } }}
      sx={{
        "& legend": {
          transition: "unset",
        },
      }}
    />
  );
}
