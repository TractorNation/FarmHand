export function isFieldInvalid(
  required: boolean,
  type: string,
  defaultValue: any,
  value: any
) {
  return (
    required &&
    (value === "" ||
      (type === "checkbox" && value === false) ||
      (type === "counter" && value === defaultValue))
  );
}
