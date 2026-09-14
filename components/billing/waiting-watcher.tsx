"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import useSWR from "swr";
import { ENTITLEMENT_URL } from "@/hooks/use-entitlement";
import type { EntitlementSummary } from "@/lib/entitlements";
import { fetcher } from "@/lib/utils";

const CHECK_EVERY_MS = 15_000;

/** Checks the request every 15 seconds and moves on once the owner decides. */
export function WaitingWatcher() {
  const router = useRouter();
  const { data } = useSWR<EntitlementSummary>(ENTITLEMENT_URL, fetcher, {
    refreshInterval: CHECK_EVERY_MS,
  });
  const status = data?.status;

  useEffect(() => {
    if (status === "active") {
      router.replace("/");
    } else if (status === "blocked") {
      router.replace("/blocked");
    }
  }, [status, router]);

  return (
    <p className="text-center text-muted-foreground text-xs" role="status">
      This page checks again every 15 seconds.
    </p>
  );
}
