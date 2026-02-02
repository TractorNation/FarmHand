import { Typography } from "@mui/material";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";
import { useEffect, useState, useRef, useCallback } from "react";
import CounterInput from "./CounterInput";
import DropdownInput from "./DropdownInput";
import CheckboxInput from "./CheckboxInput";
import TextInput from "./TextInput";
import { isFieldInvalid } from "../../utils/GeneralUtils";
import { useAsyncFetch } from "../../hooks/useAsyncFetch";
import GridInput from "./GridInput";
import SliderInput from "./SliderInput";
import NumberInput from "./NumberInput";
import TimerInput from "./TimerInput";
import AutocompleteInput from "./AutocompleteInput";
import RadioButtonInput from "./RadioButtonInput";

/* Props for the dynamic component
 */
interface DynamicComponentProps {
  component: Component;
  submitted: boolean;
}

/**
 * Component that renders a component based on its type
 *
 */
export default function DynamicComponent(props: DynamicComponentProps) {
  const { valid, touched, setValid, setTouched } = useValidation();
  const {
    addMatchData,
    addError,
    removeError,
    getMatchData,
    getAllMatchNumbers,
    getAllTeamNumbers,
    tbaMatchData,
  } = useScoutData();
  const { component, submitted } = props;

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [value, setValue] = useState<any>(null);
  const showError = !valid && (touched || submitted);

  const fetchData = useCallback(
    () => getMatchData(component.id),
    [getMatchData, component.id]
  );

  const [storedValue, loading, error] = useAsyncFetch(fetchData, []);

  useEffect(() => {
    if (loading && value === null) {
      return;
    }
    if (error) {
      console.error("Error fetching initial data:", error);
      return;
    }

    let emptyStateValue;
    switch (component.type) {
      case "checkbox":
        emptyStateValue = component.props?.default ?? false;
        break;
      case "text":
        emptyStateValue = component.props?.default ?? "";
        break;
      case "multiplechoice":
      case "dropdown":
        emptyStateValue = component.props?.default ?? "Select an option...";
        break;
      case "number":
        emptyStateValue =
          component.props?.default !== undefined
            ? component.props.default
            : null;
        break;
      case "counter":
        emptyStateValue = component.props?.default ?? 0;
        break;
      case "slider":
        if (component.props?.default !== undefined) {
          emptyStateValue = component.props.default;
        } else {
          if (component.props?.selectsRange) {
            emptyStateValue = [
              component.props.min ?? 0,
              component.props.max ?? 25,
            ];
          } else {
            emptyStateValue = component.props?.min ?? 0;
          }
        }
        break;
      case "timer":
        emptyStateValue = component.props?.default ?? "0.0";
        break;
      case "grid":
        emptyStateValue = component.props?.default ?? "3x3[]";
        break;
      default:
        emptyStateValue = undefined;
    }

    const initialDisplayValue =
      storedValue !== undefined && storedValue !== null
        ? storedValue
        : emptyStateValue;

    const isInvalid = isFieldInvalid(
      component.required!,
      component.type,
      initialDisplayValue
    );

    setValue(initialDisplayValue);
    if (component.required) {
      setValid(!isInvalid);
      if (isInvalid) {
        addError(component.name);
      }
    }

    return () => {
      if (component.required) {
        removeError(component.name);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [
    storedValue,
    loading,
    error,
    component,
    setValid,
    addError,
    removeError,
    getMatchData,
  ]);

  const handleChange = (newValue: any) => {
    setValue(newValue);
    setTouched(true);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    const isInvalid = isFieldInvalid(
      component.required!,
      component.type,
      newValue
    );

    setValid(!isInvalid);
    if (isInvalid) {
      addError(component.name);
    } else {
      removeError(component.name);
    }

    debounceTimeout.current = setTimeout(() => {
      addMatchData(component.id, newValue);
    }, 300);
  };

  const renderInput = () => {
    if (loading) {
      return (
        <Typography variant="h6" color="info">
          Loading...
        </Typography>
      );
    }
    if (error) {
      return (
        <Typography variant="h6" color="error">
          Error loading data
        </Typography>
      );
    }

    // Check if this is a protected field (Match Number or Team Number) with TBA enabled
    const isPullFromTBAEnabled = component.props?.pullFromTBA === true;
    const isProtectedField =
      component.name === "Match Number" || component.name === "Team Number";

    // Handle TBA autocomplete fields
    if (isPullFromTBAEnabled && isProtectedField) {
      if (component.name === "Match Number") {
        const matchNumbers = getAllMatchNumbers();
        return (
          <AutocompleteInput
            value={value}
            options={matchNumbers}
            onChange={handleChange}
            label={component.name}
            loading={!tbaMatchData}
            placeholder="Select or enter match number"
          />
        );
      }

      if (component.name === "Team Number") {
        let teamNumbers: string[] = getAllTeamNumbers();

        return (
          <AutocompleteInput
            value={value}
            options={teamNumbers}
            onChange={handleChange}
            label={component.name}
            loading={!tbaMatchData}
            placeholder="Select or enter team number"
          />
        );
      }
    }

    // Regular component rendering (including number input for Team/Match Number when pullFromTBA is false)
    switch (component.type) {
      case "counter":
        return (
          <CounterInput
            value={Number(value)}
            max={component.props?.max!}
            min={component.props?.min!}
            onChange={handleChange}
          />
        );

      case "dropdown":
        // Ensure value is valid - handle null/undefined and validate against options
        const dropdownOptions = component.props?.options || [];
        const normalizedDropdownValue =
          value === null || value === undefined ? undefined : String(value);
        // Validate the value is in the options list (including "Select an option...")
        const isValidDropdownValue =
          normalizedDropdownValue === undefined ||
          normalizedDropdownValue === "Select an option..." ||
          dropdownOptions.some((opt) => {
            const optionValue =
              typeof opt === "string" ? opt : "Error fetching value";
            return optionValue === normalizedDropdownValue;
          });
        const safeDropdownValue = isValidDropdownValue
          ? normalizedDropdownValue
          : undefined;

        return (
          <DropdownInput
            value={safeDropdownValue}
            options={dropdownOptions}
            onChange={handleChange}
            label={component.props?.label}
            error={showError}
            allowUnset
          />
        );
      case "multiplechoice":
        return (
          <RadioButtonInput
            value={value}
            options={component.props?.options!}
            onChange={handleChange}
            label={component.props?.label}
          />
        );
      case "checkbox":
        return <CheckboxInput value={Boolean(value)} onChange={handleChange} />;

      case "text":
        return (
          <TextInput
            value={String(value)}
            onChange={handleChange}
            multiline={component.props?.multiline}
            label={component.name}
            error={showError}
          />
        );
      case "slider":
        return (
          <SliderInput
            max={component.props?.max ?? 25}
            min={component.props?.min ?? 0}
            value={value}
            step={component.props?.step}
            onChange={handleChange}
            selectsRange={component.props?.selectsRange}
          />
        );
      case "number":
        return (
          <NumberInput
            value={value}
            onChange={handleChange}
            label={component.name}
            error={showError}
            min={component.props?.min}
            max={component.props?.max}
          />
        );
      case "timer":
        return <TimerInput value={value} onChange={handleChange} />;
      case "grid":
        return (
          <GridInput
            value={value}
            onChange={handleChange}
            rows={component.props?.rows}
            cols={component.props?.cols}
            showCoordinates={component.props?.cellLabel === "coordinates"}
          />
        );
      case "filler":
        return;
      default:
        return <Typography>Unknown component type</Typography>;
    }
  };

  return renderInput();
}
