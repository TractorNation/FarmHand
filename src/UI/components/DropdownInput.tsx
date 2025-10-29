import {
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControl,
} from "@mui/material";
import { useState } from "react";

/**
 * Props for the dropdown input
 */
interface DropdownInputProps {
  label?: string;
  options: string[];
  onChange?: (value: string) => void;
}

/**
 * @param props {@link DropdownInputProps}
 * @returns Dropdown input for the page
 */
export default function DropdownInput(props: DropdownInputProps) {
  const { label, options, onChange } = props;

  const [option, setOption] = useState("");

  const handleChange = (e: SelectChangeEvent) => {
    setOption(e.target.value);
    if (onChange) onChange(e.target.value);
  };

  return (
      <FormControl sx={{width: '70%'}}>
      <InputLabel id="demo-simple-select-label" color='secondary'>{label}</InputLabel>
        <Select
          labelId="demo-simple-select-label"
          id="demo-simple-select"
          value={option}
          label={label}
          onChange={handleChange}
          color="secondary"
          sx={{
            "& legend": {
              transition: "unset",
            },
          }}
        >
          {options.map((option) => (
            <MenuItem value={option}>{option}</MenuItem>
          ))}
        </Select>
      </FormControl>
  );
}
