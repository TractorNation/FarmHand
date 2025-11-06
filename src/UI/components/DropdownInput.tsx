import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
} from "@mui/material";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";


/**
 * Props for the dropdown input
 */
interface DropdownInputProps {
  label?: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * @param props {@link DropdownInputProps}
 * @returns Dropdown input for the page
 */
export default function DropdownInput(props: DropdownInputProps) {
  const { label, options, onChange, value } = props;
  const { valid, touched } = useValidation();
  const { submitted } = useScoutData();
  const showError = !valid && (touched || submitted);

  const handleChange = (e: SelectChangeEvent) => {
    if (onChange) onChange(e.target.value);
  };

  return (
    <FormControl sx={{ width: "70%" }}>
      <InputLabel
        id="demo-simple-select-label"
        color={showError ? "error" : "secondary"}
      >
        {label}
      </InputLabel>
      <Select
        labelId="demo-simple-select-label"
        id="demo-simple-select"
        value={value}
        label={label}
        onChange={handleChange}
        color="secondary"
        error={showError}
        sx={{
          "& legend": {
            transition: "unset",
          },
        }}
      >
        {options.map((option) => (
          <MenuItem value={option} key={option}>{option}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
