import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material";

interface DropdownInputProps {
  label?: string;
  options: String[];
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export default function RadioButtonInput(props: DropdownInputProps) {
  const { label, options, value, onChange, error, disabled } = props;

  return (
    <FormControl disabled={disabled}>
      <FormLabel>{label}</FormLabel>
      <RadioGroup
        value={value}
        onChange={(e) => {
          if (onChange) onChange(e.target.value);
        }}
      >
        {options.map((option, i) => (
          <FormControlLabel
            key={i}
            value={option}
            label={option}
            control={<Radio />}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
