import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
} from "@mui/material";

type DropdownOption = string | { label: string; value: string };

interface DropdownInputProps {
  label?: string;
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  allowUnset?: boolean; 
}

/**
 * @param props {@link DropdownInputProps}
 * @returns Dropdown input for the page
 */
export default function DropdownInput(props: DropdownInputProps) {
  const { label, options, onChange, value, error, disabled, allowUnset } = props;
  
  // Only include "Select an option..." if allowUnset is true
  const normalizedOptions = allowUnset
    ? [
        { label: "Select an option...", value: "Select an option..." },
        ...options.map((option) =>
          typeof option === "string" ? { label: option, value: option } : option
        ),
      ]
    : options.map((option) =>
        typeof option === "string" ? { label: option, value: option } : option
      );

  // Determine the fallback value based on allowUnset setting
  const defaultFallbackValue = allowUnset 
    ? "Select an option..." 
    : (normalizedOptions.length > 0 ? normalizedOptions[0].value : "");
  const selectValue = value ?? defaultFallbackValue;

  const handleChange = (e: SelectChangeEvent) => {
    // Don't allow selecting "Select an option..." when allowUnset is false
    if (!allowUnset && e.target.value === "Select an option...") {
      return;
    }
    if (onChange) onChange(e.target.value);
  };

  return (
    <FormControl fullWidth variant="outlined" size="small">
      <InputLabel color={error ? "error" : "secondary"}>{label}</InputLabel>
      <Select
        value={selectValue}
        label={label}
        onChange={handleChange}
        disabled={disabled}
        color="secondary"
        error={error}
        sx={{
          "& legend": {
            transition: "unset",
          },
        }}
      >
        {normalizedOptions.map((option) => (
          <MenuItem value={option.value} key={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
