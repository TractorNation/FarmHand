import * as React from "react";
import { NumberField as BaseNumberField } from "@base-ui-components/react/number-field";
import IconButton from "@mui/material/IconButton";
import FormControl from "@mui/material/FormControl";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

/**
 * This component is a placeholder for FormControl to correctly set the shrink label state on SSR.
 */
function SSRInitialFilled(_: BaseNumberField.Root.Props) {
  return null;
}
SSRInitialFilled.muiName = "Input";

interface NumberFieldProps extends BaseNumberField.Root.Props {
  label?: React.ReactNode;
  size?: "small" | "medium";
  error?: boolean;
  value?: number | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
}

export default function NumberInput(props: NumberFieldProps) {
  const {
    label,
    error,
    size = "medium",
    onChange,
    min,
    max,
    value,
    disabled,
    required,
  } = props;

  // State to hold the string value of the input for controlled behavior
  const [inputValue, setInputValue] = React.useState(
    value === null || value === undefined ? "" : String(value)
  );

  // Sync local state when the external value prop changes
  React.useEffect(() => {
    const stringValue = value === null || value === undefined ? "" : String(value);
    setInputValue(stringValue);
  }, [value]);

  return (
    <BaseNumberField.Root
      allowWheelScrub
      format={{ useGrouping: false }}
      value={value ?? null}
      min={min}
      max={max}
      disabled={disabled}
      required={required}
      onValueChange={(newValue) => {
        // Pass null values to allow for an empty input
        if (onChange) {
          onChange(newValue);
        }
      }}
      render={(props, state) => (
        <FormControl
          size={size}
          ref={props.ref}
          disabled={state.disabled}
          required={state.required}
          error={error}
          variant="outlined"
        >
          {props.children}
        </FormControl>
      )}
    >
      <SSRInitialFilled />
      <InputLabel>{label}</InputLabel>
      <BaseNumberField.Input
        render={(props) => (
          <OutlinedInput
            label={label}
            inputRef={props.ref}
            value={inputValue}
            onBlur={(e) => {
              // On blur, if the input is empty but required, set it to the minimum value.
              // Otherwise, format the current value.
              if (onChange &&e.target.value === "" && required && min !== undefined) {
                onChange(min);
                setInputValue(String(min));
              } else {
                // Re-format the value on blur to handle cases like "5." -> "5"
                const formatted = value === null || value === undefined ? "" : String(value);
                setInputValue(formatted);
              }
              props.onBlur?.(e);
            }}
            onChange={(e) => {
              const newStringValue = e.target.value;
              setInputValue(newStringValue);

              if (e.target.value === "") {
                onChange?.(null);
              } else {
                // Let the base component parse and handle the change
                props.onChange?.(e);
              }
            }}
            onKeyUp={props.onKeyUp}
            onKeyDown={props.onKeyDown}
            onFocus={props.onFocus}
            slotProps={{
              input: props,
            }}
            endAdornment={
              <InputAdornment
                position="end"
                sx={{
                  flexDirection: "column",
                  maxHeight: "unset",
                  alignSelf: "stretch",
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  ml: 0,
                  "& button": {
                    py: 0,
                    flex: 1,
                    borderRadius: 0.5,
                  },
                }}
              >
                <BaseNumberField.Increment
                  render={<IconButton size={size} aria-label="Increase" />}
                >
                  <KeyboardArrowUpIcon
                    fontSize={size}
                    sx={{ transform: "translateY(2px)" }}
                  />
                </BaseNumberField.Increment>

                <BaseNumberField.Decrement
                  render={<IconButton size={size} aria-label="Decrease" />}
                >
                  <KeyboardArrowDownIcon
                    fontSize={size}
                    sx={{ transform: "translateY(-2px)" }}
                  />
                </BaseNumberField.Decrement>
              </InputAdornment>
            }
            sx={{ pr: 0 }}
          />
        )}
      />
    </BaseNumberField.Root>
  );
}
