import { Box, TextField } from "@mui/material";
import { ChangeEvent, useState } from "react";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";

/**
 * Props for the text input component
 */
interface TextInputProps {
  label?: string;
  multiline?: boolean;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/**
 * An input for text
 *
 * @param props {@link TextInputProps}
 * @returns A multiline text input
 */
export default function TextInput(props: TextInputProps) {
  const { label, multiline, defaultValue, onChange } = props;

  const [text, setText] = useState(defaultValue);
  const { valid, touched } = useValidation();
  const { submitted } = useScoutData();
  const showError = !valid && (touched || submitted);

  const updateText = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    if (onChange) onChange(value);
  };

  return (
    <Box width={"70%"}>
      <TextField
        variant="outlined"
        multiline={multiline ?? false}
        color="secondary"
        fullWidth
        label={label}
        onChange={updateText}
        value={text}
        error={showError}
        sx={{
          "& legend": {
            transition: "unset",
          },
        }}
      />
    </Box>
  );
}
