import { memo } from "react";
import { Button } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";

/**
 * Props for the Checkbox input
 */
interface CheckboxInputProps {
  value: boolean;
  onChange?: (value: boolean) => void;
  /** Accessible name. The visible label lives on the surrounding InputCard. */
  label?: string;
}

/**
 * A checkbox input for the scout page
 *
 * @param props {@link CheckboxInputProps}
 * @returns a checkbox component
 */
function CheckboxInput(props: CheckboxInputProps) {
  const { value, onChange, label } = props;

  return (
    <Button
      // A toggle button, not a checkbox: `aria-pressed` is what carries the on/off
      // state. Without it the control announces as a plain button and a screen-reader
      // user cannot tell whether the answer is yes or no — the icon is the only cue.
      aria-pressed={value}
      aria-label={label}
      onClick={() => {
        const newValue = !value;
        if (onChange) onChange(newValue);
      }}
      variant={value ? "contained" : "outlined"}
      color="secondary"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        maxWidth: 200,
        aspectRatio: "2 / 1",
        fontSize: "1.5rem",
        borderRadius: 3,
        borderWidth: 2,
        transition: "all 0.2s ease",
        "&:hover": {
          borderWidth: 2,
          transform: "scale(1.05)",
        },
      }}
    >
      {value ? <CheckIcon fontSize="large" /> : <CloseIcon fontSize="large" />}
    </Button>
  );
}

export default memo(CheckboxInput);
