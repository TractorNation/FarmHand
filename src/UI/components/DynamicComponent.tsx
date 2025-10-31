import { Typography } from "@mui/material";
import CounterInput from "./CounterInput";
import InputCard from "../InputCard";
import DropdownInput from "./DropdownInput";
import CheckboxInput from "./CheckboxInput";
import TextInput from "./TextInput";

/**
 * Component that renders a component based on its type
 *
 */
export default function DynamicComponent({component}: {component: Component}) {
  const handleChange = (newValue: any) => {
    // Eventually add logic for validation check and state saving
  };

  const renderInput = () => {
    switch (component.type) {
      case "counter":
        return (
          <CounterInput
            defaultValue={component.props?.default as number}
            max={component.props?.max!}
            min={component.props?.min!}
            valid={true}
            onChange={handleChange}
          />
        );

      case "dropdown":
        return (
          <DropdownInput
            options={component.props?.options!}
            onChange={handleChange}
            valid={true}
            label={component.props?.label}
          />
        );

      case "checkbox":
        return <CheckboxInput onChange={handleChange} valid={true} />;

      case "text":
        return (
          <TextInput
            onChange={handleChange}
            valid={true}
            multiline={component.props?.multiline!}
            label={component.props?.label}
          />
        );

      default:
        return <Typography>Unknown component type</Typography>;
    }
  };

  return (
    <InputCard label={component.name} required={false} valid={true}>
      {renderInput()}
    </InputCard>
  );
}
