import { useEffect, useRef } from "react";
import { useAOSStore } from "@/stores/aosStore";

const ALERTS = [
  { message: "UNAUTHORIZED SIGNAL DETECTED — ORIGIN UNKNOWN", severity: "medium" as const },
  { message: "ENCRYPTION BREACH ATTEMPT — NODE 47", severity: "high" as const },
  { message: "SATELLITE UPLINK INTERMITTENT", severity: "low" as const },
  { message: "INTRUSION DETECTED — PROTOCOL 7 ACTIVATED", severity: "critical" as const },
  { message: "DATA PACKET LOSS — REROUTING THROUGH BACKUP", severity: "medium" as const },
  { message: "NEW ARCHIVE ENTRY DECRYPTED", severity: "low" as const },
  { message: "AGENT ACTIVITY SPIKE — SECTOR 9", severity: "medium" as const },
  { message: "FIREWALL VIOLATION — PORT 8080", severity: "high" as const },
  { message: "LEGACY NODE RECONNECTED", severity: "low" as const },
  { message: "QUANTUM ENCRYPTION ROTATION COMPLETE", severity: "low" as const },
];

export default function AOSAlertGenerator() {
  const added = useRef(false);

  useEffect(() => {
    if (added.current) return;
    added.current = true;

    const { addAlert } = useAOSStore.getState();

    // First alert after a delay
    const t1 = setTimeout(() => {
      const a = ALERTS[Math.floor(Math.random() * ALERTS.length)];
      addAlert(a);
    }, 12000);

    // Then random alerts every 25-45 seconds
    let t2: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      t2 = setTimeout(
        () => {
          const a = ALERTS[Math.floor(Math.random() * ALERTS.length)];
          addAlert(a);
          scheduleNext();
        },
        25000 + Math.random() * 20000,
      );
    }
    scheduleNext();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return null;
}
