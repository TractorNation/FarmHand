import { Button, Stack, Typography} from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";

/**
 * Props for the counter
 */
interface CounterInputProps {
  max?: number;
  min?: number;
  value: number;
  onChange?: (value: number) => void;
}

/**
 *
 * @param props {@link CounterInputProps}
 * @returns A component that functions similarly to an HTML native number input
 */
export default function CounterInput(props: CounterInputProps) {
  const { max, min, value, onChange } = props;

  const increment = () => {
    const newCount = Math.min(value + 1, max ?? Number.POSITIVE_INFINITY);
    if (onChange) {
      onChange(newCount);
    }
  };
  const decrement = () => {
    const newCount = Math.max(value - 1, min ?? Number.NEGATIVE_INFINITY);
    if (onChange) onChange(newCount);
  };

  const isMin = min !== undefined && value <= min;
  const isMax = max !== undefined && value >= max;

  return (
    <Stack
      direction={"row"}
      alignItems={"center"}
      justifyContent={"center"}
      spacing={2}
      sx={{ width: "100%", maxWidth: 300 }}
    >
      <Button
        onClick={decrement}
        variant="outlined"
        color="secondary"
        disabled={isMin}
        sx={{
          minWidth: 56,
          minHeight: 56,
          aspectRatio: "1/1",
          borderRadius: 2,
        }}
      >
        <RemoveIcon fontSize="large" />
      </Button>
      <Typography
        variant="h5"
        sx={{ minWidth: 60, textAlign: "center", color: "text.primary" }}
      >
        {value}
      </Typography>
      <Button
        onClick={increment}
        variant="contained"
        color="secondary"
        disabled={isMax}
        sx={{
          minWidth: 56,
          minHeight: 56,
          aspectRatio: "1/1",
          borderRadius: 2,
        }}
      >
        <AddIcon fontSize="large" />
      </Button>
    </Stack>
  );
}