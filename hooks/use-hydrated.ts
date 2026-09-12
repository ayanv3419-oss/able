"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {
  // Hydration has no external subscription to clean up.
};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Keep controlled form fields disabled until their event handlers are ready. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
