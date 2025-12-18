import { Autocomplete, TextField } from "@mui/material";

import { useState, useEffect } from "react";

interface AutocompleteInputProps {
  label?: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

/**
 * Autocomplete input component for team and match numbers
 * @param props {@link AutocompleteInputProps}
 * @returns Autocomplete input for the page
 */
export default function AutocompleteInput(props: AutocompleteInputProps) {
  const { label, options, onChange, value, disabled, loading, placeholder } =
    props;
  const [inputValue, setInputValue] = useState("");
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <Autocomplete
      sx={{ width: "100%" }}
      disabled={disabled}
      loading={loading}
      value={value ?? null}
      onChange={(_, newValue) => {
        if (onChange && newValue !== null) {
          onChange(newValue);
        }
      }}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
        if (onChange && newInputValue) {
          onChange(newInputValue);
        }
      }}
      options={options}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} />
      )}
    />
  );
}
