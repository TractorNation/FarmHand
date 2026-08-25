import { Typography } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";
import { useEffect, useState, useRef, useCallback } from "react";
import CounterInput from "./CounterInput";
import DropdownInput from "./DropdownInput";
import CheckboxInput from "./CheckboxInput";
import TextInput from "./TextInput";
import { UNSET_OPTION, isFieldInvalid } from "../../utils/fieldValidation";
import { useAsyncFetch } from "../../hooks/useAsyncFetch";
import GridInput from "./GridInput";
import SliderInput from "./SliderInput";
import NumberInput from "./NumberInput";
import TimerInput from "./TimerInput";
import AutocompleteInput from "./AutocompleteInput";
import RadioButtonInput from "./RadioButtonInput";
import PathInput from "./PathInput";

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
    setWatchedMatchNumber,
    setWatchedAlliance,
    setWatchedPosition,
    getTeamForCurrentSlot,
  } = useScoutData();
  const { component, submitted } = props;

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const [value, setValue] = useState<any>(null);
  const showError = !valid && (touched || submitted);

  /** Push a value into the watched-state slots so getTeamForCurrentSlot stays current. */
  const syncWatchedState = useCallback((name: string, val: any) => {
    if (name === "Match Number") {
      setWatchedMatchNumber(val !== null && val !== undefined ? String(val) : null);
    } else if (name === "Alliance") {
      setWatchedAlliance(val && val !== UNSET_OPTION ? String(val) : null);
    } else if (name === "Position") {
      setWatchedPosition(val && val !== UNSET_OPTION ? String(val) : null);
    }
  }, [setWatchedMatchNumber, setWatchedAlliance, setWatchedPosition]);

  const fetchData = useCallback(
    () => getMatchData(component.id),
    [getMatchData, component.id]
  );

  const [storedValue, loading, error] = useAsyncFetch(fetchData);

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
        emptyStateValue = component.props?.default ?? UNSET_OPTION;
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
      case "grid": {
        // Must match GridInput.formatGridValue's "<rows>x<cols>:[...]" shape and use
        // the field's real dimensions — parseGridData requires the colon and returns
        // null without it, which silently broke dimension parsing in analysis.
        const gridRows = component.props?.rows ?? 3;
        const gridCols = component.props?.cols ?? 3;
        emptyStateValue =
          component.props?.default ?? `${gridRows}x${gridCols}:[]`;
        break;
      }
      case "autopath":
        emptyStateValue = { noAuto: false, points: [], events: [] };
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
    
    /*
      For Team Number: if there's no stored value, skip setValue to avoid overwriting
      the auto-populate effect. When the form resets, async storage fetches for each
      field complete at different times. If Team Number's fetch resolves after the
      auto-populate has already written the correct team, calling setValue(null) here
      would overwrite it — and since getTeamForCurrentSlot's reference won't change
      again, the auto-populate won't re-fire to recover. Skipping setValue(null) is safe
      because the component already starts with value=null on mount.
    */
    if (component.name !== "Team Number" || initialDisplayValue !== null) {
      setValue(initialDisplayValue);
    }

    // When persisted values are loaded (e.g. Alliance/Position survive a reset),
    // push them into context so getTeamForCurrentSlot() starts with the right state.
    syncWatchedState(component.name, initialDisplayValue);

    if (component.required) {
      setValid(!isInvalid);
      if (isInvalid) {
        addError(component.id, component.name);
      }
    }

    return () => {
      if (component.required) {
        removeError(component.id);
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
    syncWatchedState,
  ]);

  const handleChange = useCallback((newValue: any) => {
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
      addError(component.id, component.name);
    } else {
      removeError(component.id);
    }

    // Keep the context's watched states in sync so getTeamForCurrentSlot() stays current.
    syncWatchedState(component.name, newValue);

    debounceTimeout.current = setTimeout(() => {
      addMatchData(component.id, newValue);
    }, 300);
  }, [
    component.id, component.name, component.required, component.type,
    addMatchData, addError, removeError, setValid, setTouched,
    syncWatchedState,
  ]);

  // When all three slot inputs are filled, get team number from the match schedule
  // and write it directly into this field's value and the match data store.
  // getTeamForCurrentSlot is a useCallback that changes reference whenever any of
  // watchedMatchNumber/watchedAlliance/watchedPosition changes, so this effect
  // re-runs automatically on every relevant field change.
  useEffect(() => {
    if (component.name !== "Team Number") return;
    const derived = getTeamForCurrentSlot();
    if (!derived) return;

    setValue(derived);
    addMatchData(component.id, derived);

    const isInvalid = isFieldInvalid(component.required!, component.type, derived);
    setValid(!isInvalid);
    if (isInvalid) addError(component.id, component.name);
    else removeError(component.id);
  }, [
    getTeamForCurrentSlot,
    component.name,
    component.id,
    component.required,
    component.type,
    addMatchData,
    addError,
    removeError,
    setValid,
  ]);

  const renderInput = () => {
    if (loading) {
      return <Skeleton variant="rounded" height={48} />;
    }
    if (error) {
      return (
        <Typography variant="h6" color="error">
          Error loading data
        </Typography>
      );
    }

    /**
     * Accessible name for the control.
     *
     * A schema-authored `props.label` wins, but falls back to the field name so a
     * control always has one. Most built-in schemas never set `props.label`, so
     * passing it alone leaves the form unnamed for assistive tech.
     */
    const fieldLabel = component.props?.label ?? component.name;

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
            label={fieldLabel}
            loading={!tbaMatchData}
            placeholder="Select or enter match number"
          />
        );
      }

      if (component.name === "Team Number") {
        const teamNumbers: string[] = getAllTeamNumbers();

        return (
          <AutocompleteInput
            value={value}
            options={teamNumbers}
            onChange={handleChange}
            label={fieldLabel}
            loading={!tbaMatchData}
            placeholder="Select or enter team number"
            disabled={!!getTeamForCurrentSlot()}
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
            max={component.props?.max}
            min={component.props?.min}
            onChange={handleChange}
          />
        );

      case "dropdown": {
        // Ensure value is valid - handle null/undefined and validate against options
        const dropdownOptions = component.props?.options || [];
        const normalizedDropdownValue =
          value === null || value === undefined ? undefined : String(value);
        // Validate the value is in the options list (including the unset sentinel)
        const isValidDropdownValue =
          normalizedDropdownValue === undefined ||
          normalizedDropdownValue === UNSET_OPTION ||
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
            label={fieldLabel}
            error={showError}
            allowUnset
          />
        );
      }
      case "multiplechoice":
        return (
          <RadioButtonInput
            value={value}
            options={component.props?.options ?? []}
            onChange={handleChange}
            label={fieldLabel}
          />
        );
      case "checkbox":
        return (
          <CheckboxInput
            value={Boolean(value)}
            onChange={handleChange}
            label={fieldLabel}
          />
        );

      case "text":
        return (
          <TextInput
            // Not `String(value)`: `value` is null on the render between the stored
            // value resolving and the hydration effect running, and String(null)
            // puts the literal text "null" in the box.
            value={value == null ? "" : String(value)}
            onChange={handleChange}
            multiline={component.props?.multiline}
            label={fieldLabel}
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
            label={fieldLabel}
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
      case "autopath":
        return (
          <PathInput
            value={value}
            onChange={handleChange}
            props={component.props}
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
