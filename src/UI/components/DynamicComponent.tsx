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
  const { addMatchData, addError, removeError, getMatchData } = useScoutData();
  const { component, submitted } = props;

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [value, setValue] = useState<any>(null);
  const showError = !valid && (touched || submitted);
  
  const fetchData = useCallback(() => getMatchData(component.id), [getMatchData, component.id]);
  
  const [storedValue, loading, error] = useAsyncFetch(
    fetchData,
    []
  );

  useEffect(() => {
    if (loading && value === null) {
      return;
    }
    if (error) {
      console.error("Error fetching initial data:", error);
      return;
    }

    let isMounted = true;

    let initial;
    if (storedValue !== undefined && storedValue !== null) {
      initial = storedValue;
    } else {
      switch (component.type) {
        case "checkbox":
          initial = component.props?.default ?? false;
          break;
        case "text":
        case "dropdown":
          initial = component.props?.default ?? "";
          break;
        case "counter":
          initial = component.props?.default ?? 0;
          break;
        default:
          initial = undefined;
      }
    }

    const isInvalid = isFieldInvalid(
      component.required!,
      component.type,
      component.props?.default!,
      initial
    );

    if (isMounted) {
      setValue(initial);
      if (component.required) {
        setValid(!isInvalid);
        if (isInvalid) {
          addError(component.name);
        }
      }
    }

    return () => {
      isMounted = false;
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
      component.props?.default!,
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
        return (
          <DropdownInput
            value={String(value)}
            options={component.props?.options!}
            onChange={handleChange}
            label={component.props?.label}
            error={showError}
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
            label={component.props?.label}
            error={showError}
          />
        );

      default:
        return <Typography>Unknown component type</Typography>;
    }
  };

  return renderInput();
}
