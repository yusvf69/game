import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAOSStore, type AOSAlert } from "@/stores/aosStore";

const severityConfig = {
  low: { color: "text-yellow-500", border: "border-yellow-500/30", label: "NOTICE" },
  medium: { color: "text-orange-400", border: "border-orange-500/40", label: "WARNING" },
  high: { color: "text-red-400", border: "border-red-500/50", label: "ALERT" },
  critical: { color: "text-red-300", border: "border-red-500/70", label: "CRITICAL" },
};

export default function AOSAlert() {
  const { alerts, removeAlert, triggerGlitch } = useAOSStore();

  useEffect(() => {
    if (alerts.length > 0) {
      const last = alerts[alerts.length - 1];
      if (last.severity === "high" || last.severity === "critical") {
        triggerGlitch(last.severity === "critical" ? 2 : 1);
        setTimeout(() => useAOSStore.getState().clearGlitch(), 300);
      }
    }
  }, [alerts.length]);

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 w-72">
      <AnimatePresence>
        {alerts.map((alert: AOSAlert) => {
          const cfg = severityConfig[alert.severity];
          return (
            <motion.div
              key={alert.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={`glass-strong border ${cfg.border} rounded-lg p-3 cursor-pointer`}
              onClick={() => removeAlert(alert.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-mono text-[10px] tracking-widest ${cfg.color}`}>{cfg.label}</span>
                <span className="font-mono text-[10px] text-zinc-700">NOW</span>
              </div>
              <p className="font-mono text-xs text-zinc-300">{alert.message}</p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
