import { Grid } from "@mui/material";
import CounterInput from "../UI/components/CounterInput";
import TextInput from "../UI/components/TextInput";
import InputCard from "../UI/InputCard";
import CheckboxInput from "../UI/components/CheckboxInput";
import DropdownInput from "../UI/components/DropdownInput";

export default function Scout() {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <InputCard label="Counter" required={false} valid={true}>
          <CounterInput defaultValue={0} min={0} max={100} valid={true} />
        </InputCard>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <InputCard label="Text Input" required={true} valid={true}>
          <TextInput label="Comments" multiline valid={true} />
        </InputCard>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <InputCard label="Checkbox Input" required={false} valid={true}>
          <CheckboxInput defaultValue={false} />
        </InputCard>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <InputCard label="Dropdown Input" required={true} valid={true}>
          <DropdownInput
            label={"Select an option"}
            options={["Option 1", "Option 2", "Option 3"]}
            valid={true}
          />
        </InputCard>
      </Grid>
    </Grid>
  );
}
