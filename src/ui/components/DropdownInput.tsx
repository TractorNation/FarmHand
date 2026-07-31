import { memo, useId } from "react";
import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
} from "@mui/material";
import { UNSET_OPTION } from "../../utils/fieldValidation";

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
function DropdownInput(props: DropdownInputProps) {
  const { label, options, onChange, value, error, disabled, allowUnset } = props;
  const labelId = useId();
  
  // Only include the unset sentinel if allowUnset is true
  const normalizedOptions = allowUnset
    ? [
        { label: UNSET_OPTION, value: UNSET_OPTION },
        ...options.map((option) =>
          typeof option === "string" ? { label: option, value: option } : option
        ),
      ]
    : options.map((option) =>
        typeof option === "string" ? { label: option, value: option } : option
      );

  // Determine the fallback value based on allowUnset setting
  const defaultFallbackValue = allowUnset
    ? UNSET_OPTION
    : (normalizedOptions.length > 0 ? normalizedOptions[0].value : "");
  const selectValue = value ?? defaultFallbackValue;

  const handleChange = (e: SelectChangeEvent) => {
    // Don't allow selecting the unset sentinel when allowUnset is false
    if (!allowUnset && e.target.value === UNSET_OPTION) {
      return;
    }
    if (onChange) onChange(e.target.value);
  };

  return (
    <FormControl fullWidth variant="outlined" size="small">
      {/* `labelId` is what associates the two. A hand-built FormControl does not wire
          it the way TextField does, so without it the dropdown renders a visible
          label that assistive tech cannot connect to the control. */}
      <InputLabel id={labelId} color={error ? "error" : "secondary"}>
        {label}
      </InputLabel>
      <Select
        labelId={label ? labelId : undefined}
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

export default memo(DropdownInput);
