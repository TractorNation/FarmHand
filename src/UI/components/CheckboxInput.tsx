import { Button } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import useToggle from "../../hooks/useToggle";

/**
 * Props for the Checkbox input
 */
interface CheckboxInputProps {
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
}

/**
 * A checkbox input for the scout page
 *
 * @param props {@link CheckboxInputProps}
 * @returns a checkbox component
 */
export default function CheckboxInput(props: CheckboxInputProps) {
  const { defaultValue, onChange } = props;
  const { active, toggleActive } = useToggle(defaultValue);

  return (
    <Button
      onClick={() => {
        toggleActive();
        if (onChange) onChange(active);
      }}
      variant="contained"
      color={active ? "secondary" : "inherit"}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "70%",
        height: "100%",
      }}
      disableElevation
    >
      {active ? <CheckIcon /> : <CloseIcon />}
    </Button>
  );
}
