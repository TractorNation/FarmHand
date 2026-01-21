import {
  Slider,
  Typography,
  Box
} from "@mui/material";

interface SliderInputProps {
  max: number;
  min: number;
  step?: number;
  value: number | number[];
  onChange?: (value: number | number[]) => void;
  selectsRange?: boolean;
}
export default function SliderInput(props: SliderInputProps) {
  const { max, min, step, value, onChange, selectsRange } = props;

  const handleChange = (_: Event, newValue: number | number[]) => {
    if (onChange) onChange(newValue);
  };

  const valueIsArray = Array.isArray(value);
  let displayValue = value;

  if (selectsRange && !valueIsArray) {
    displayValue = [value as number, value as number];
  } else if (!selectsRange && valueIsArray) {
    displayValue = (value as number[])[0];
  }

  return (
    <Box sx={{ alignSelf: 'stretch' }}>
      <Slider
        color="secondary"
        value={displayValue}
        onChange={handleChange}
        min={min}
        max={max}
        step={step ?? 1}
        valueLabelDisplay="on"
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography
          variant="body2"
          color="text.secondary"
        >
        {min}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
        {max}
        </Typography>
      </Box>
    </Box>
  );
}
