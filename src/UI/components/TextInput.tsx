import { Box, TextField } from "@mui/material";
import { ChangeEvent, useState } from "react";

/**
 * Props for the text input component
 */
interface TextInputProps {
  label?: string;
  multiline?: boolean;
  valid?: boolean;
  onChange?: (value: string) => void;
}

/**
 * An input for text
 *
 * @param props {@link TextInputProps}
 * @returns A multiline text input
 */
export default function TextInput(props: TextInputProps) {
  const [text, setText] = useState("");

  const { label, multiline, valid, onChange } = props;

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
        color='secondary'
        fullWidth
        label={label}
        onChange={updateText}
        value={text}
        error={!valid}
        sx={{
          "& legend": {
            transition: "unset",
          },
        }}
      />
    </Box>
  );
}
