import { createContext, ReactNode, useContext, useState } from "react";

interface ValidationContextType {
  valid: boolean;
  touched: boolean;
  setValid: (valid: boolean) => void;
  setTouched: (touched: boolean) => void;
}

export const ValidationContext = createContext<ValidationContextType | null>(
  null
);

export default function ValidationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [valid, setValid] = useState(true);
  const [touched, setTouched] = useState(false);

  return (
    <ValidationContext.Provider
      value={{ valid, touched, setValid, setTouched }}
    >
      {children}
    </ValidationContext.Provider>
  );
}

export function useValidation() {
  const context = useContext(ValidationContext);
  if (!context)
    throw new Error("useValidation must be used within a ValidationProvider");
  return context;
}
