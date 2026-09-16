"use client";

import { useEffect } from "react";
import { BillingStore } from "@/lib/store";

export function DatabaseSyncListener() {
  useEffect(() => {
    // Initial sync with Neon PostgreSQL
    BillingStore.syncWithDatabase();

    // Re-sync when window gains focus or online
    const handleOnline = () => {
      BillingStore.syncWithDatabase();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleOnline);
    };
  }, []);

  return null;
}
