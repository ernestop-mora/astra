"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { DEMO_TIMESTAMP } from "@/data/baseline";
import { isSensorId } from "@/data/sensors";
import { DEMO_FAULT_AGE_MS } from "@/lib/faultClock";
import { useAppStore } from "@/store/useAppStore";

/**
 * ?fail=heart|bp|glucose|temp|sleep fails that sensor on any tab. ?demo=1 on
 * /workshop fails the glucose monitor by default. Applied once per load;
 * after that the Simulate control in Workshop owns the fault.
 */
export function FaultFromUrl() {
  const pathname = usePathname();
  const setSensorFault = useAppStore((s) => s.setSensorFault);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const demo = q.get("demo") === "1";
    const fail = q.get("fail");
    const sensor = isSensorId(fail) ? fail : demo && pathname === "/workshop" ? "glucose" : null;
    if (!sensor || useAppStore.getState().sensorFault) return;
    setSensorFault(sensor, (demo ? DEMO_TIMESTAMP : Date.now()) - DEMO_FAULT_AGE_MS);
  }, [pathname, setSensorFault]);

  return null;
}
