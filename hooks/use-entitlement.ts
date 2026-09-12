"use client";

import useSWR from "swr";
import type { EntitlementSummary } from "@/lib/entitlements";
import { fetcher } from "@/lib/utils";

export const ENTITLEMENT_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/entitlements`;

export function useEntitlement() {
  return useSWR<EntitlementSummary>(ENTITLEMENT_URL, fetcher, {
    refreshInterval: 60_000,
    refreshWhenHidden: false,
  });
}
