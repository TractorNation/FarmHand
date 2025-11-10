import { useState } from "react";

export default function useToggle(defaultTrue?: boolean) {
  const [active, setActive] = useState(defaultTrue ?? false);

  const toggleActive = () => {
    const newValue = !active;
    setActive(newValue);
  };

  return [active, toggleActive] as const;
}
