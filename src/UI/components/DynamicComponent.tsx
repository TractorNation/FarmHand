import { Typography } from "@mui/material";
import CounterInput from "./CounterInput";
import InputCard from "../InputCard";
import DropdownInput from "./DropdownInput";
import CheckboxInput from "./CheckboxInput";
import TextInput from "./TextInput";
import { useValidation } from "../../context/ValidationContext";
import { useScoutData } from "../../context/ScoutDataContext";
import { useEffect, useState } from "react";

/**
 * Props for the dynamic component
 */
interface DynamicComponentProps {
  component: Component;
}

/**
 * Component that renders a component based on its type
 *
 */
export default function DynamicComponent(props: DynamicComponentProps) {
  const { setValid, setTouched } = useValidation();
  const { addMatchData, addError, removeError, getMatchData } = useScoutData();
  const { component } = props;
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleChange = (newValue: any) => {
    setValue(newValue);
    setTouched(true);
    const isInvalid =
      component.required &&
      (newValue === "" ||
        (component.type === "checkbox" && !newValue) ||
        (component.type === "counter" &&
          newValue === component.props?.default));

    setValid(!isInvalid);
    if (isInvalid) {
      addError(component.name);
    } else {
      removeError(component.name);
    }

    addMatchData(component.name, newValue);
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitialValue = async () => {
      const storedValue = await getMatchData(component.name);

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

      if (isMounted) {
        setValue(initial);
        setLoading(false);
        addMatchData(component.name, initial);

        if (component.required) {
          const isInvalid =
            initial === "" ||
            (component.type === "checkbox" && initial === false) ||
            (component.type === "counter" &&
              initial === component.props?.default);

          setValid(!isInvalid);
          if (isInvalid) {
            addError(component.name);
          }
        }
      }
    };
    loadInitialValue();

    return () => {
      isMounted = false;
      if (component.required) {
        removeError(component.name);
      }
    };
  }, []);

  const renderInput = () => {
    if (loading) {
      return null;
    }

    switch (component.type) {
      case "counter":
        return (
          <CounterInput
            defaultValue={value}
            max={component.props?.max!}
            min={component.props?.min!}
            onChange={handleChange}
          />
        );

      case "dropdown":
        return (
          <DropdownInput
            defaultValue={value}
            options={component.props?.options!}
            onChange={handleChange}
            label={component.props?.label}
          />
        );

      case "checkbox":
        return <CheckboxInput defaultValue={value} onChange={handleChange} />;

      case "text":
        return (
          <TextInput
            defaultValue={value}
            onChange={handleChange}
            multiline={component.props?.multiline!}
            label={component.props?.label}
          />
        );

      default:
        return <Typography>Unknown component type</Typography>;
    }
  };

  return (
    <InputCard label={component.name} required={component.required ?? false}>
      {renderInput()}
    </InputCard>
  );
}
