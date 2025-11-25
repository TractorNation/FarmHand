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
}

/**
 * @param props {@link DropdownInputProps}
 * @returns Dropdown input for the page
 */
export default function DropdownInput(props: DropdownInputProps) {
  const { label, options, onChange, value, error, disabled } = props;
  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : option
  );

  const handleChange = (e: SelectChangeEvent) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <FormControl fullWidth variant="outlined" size="small">
      <InputLabel color={error ? "error" : "secondary"}>{label}</InputLabel>
      <Select
        value={value ?? ""}
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
