import { useState } from "react";

export default function useDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (newOpen: boolean) => () => {
    setDrawerOpen(newOpen);
  };

  return {
    drawerOpen,
    toggleDrawer,
  };
}
