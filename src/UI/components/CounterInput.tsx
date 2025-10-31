import { Button, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";
import { useState } from "react";

/**
 * Props for the counter
 */
interface CounterInputProps {
  max?: number;
  min?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

/**
 *
 * @param props {@link CounterInputProps}
 * @returns A component that functions similarly to an HTML native number input
 */
export default function CounterInput(props: CounterInputProps) {
  const { max, min, defaultValue, onChange } = props;
  const [count, setCount] = useState(defaultValue ?? 0);

  const increment = () => {
    const newCount = Math.min(count + 1, max ?? Number.POSITIVE_INFINITY);
    setCount(newCount);
    if (onChange) {
      onChange(newCount);
    }
  };
  const decrement = () => {
    const newCount = Math.max(count - 1, min ?? Number.NEGATIVE_INFINITY);
    setCount(newCount);
    if (onChange) onChange(newCount);
  };

  return (
    <Stack
      direction={"row"}
      alignItems={"center"}
      justifyContent={"space-around"}
      width={"70%"}
    >
      <Button
        onClick={decrement}
        variant="contained"
        color="inherit"
        sx={{
          aspectRatio: "1/1",
        }}
        disableElevation
      >
        <RemoveIcon />
      </Button>
      <Typography variant="h5">{count}</Typography>
      <Button
        onClick={increment}
        variant="contained"
        color="inherit"
        sx={{ aspectRatio: "1/1" }}
        disableElevation
      >
        <AddIcon />
      </Button>
    </Stack>
  );
}
