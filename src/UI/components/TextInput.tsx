import { TextField } from "@mui/material";
import { ChangeEvent } from "react";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";

/**
 * Props for the text input component
 */
interface TextInputProps {
  label?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * An input for text
 *
 * @param props {@link TextInputProps}
 * @returns A multiline text input
 */
export default function TextInput(props: TextInputProps) {
  const { label, multiline, value, onChange } = props;

  const { valid, touched } = useValidation();
  const { submitted } = useScoutData();
  const showError = !valid && (touched || submitted);

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
      value={value}
      error={showError}
      maxRows={5}
      slotProps={{ htmlInput: { maxLength: 75 } }}
      sx={{
        width: "70%",
        "& legend": {
          transition: "unset",
        },
      }}
    />
  );
}
