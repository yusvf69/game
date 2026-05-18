import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AOSTerminalText from "./AOSTerminalText";
import { useAOSStore } from "@/stores/aosStore";

interface BootStep {
  text: string;
  delay: number;
  speed?: number;
}

interface Props {
  steps: BootStep[];
  onComplete: () => void;
  pageKey: string;
  alreadyBooted: boolean;
}

export default function AOSBoot({ steps, onComplete, pageKey, alreadyBooted }: Props) {
  const { booted } = useAOSStore();
  if (alreadyBooted || booted[pageKey]) return null;

  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const advance = useCallback(() => {
    if (stepIndex < steps.length - 1) {
      setTimeout(() => setStepIndex(stepIndex + 1), steps[stepIndex + 1].delay);
    } else {
      setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 600);
    }
  }, [stepIndex, steps, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`boot-${pageKey}`}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-[60] bg-[#020408] flex items-center justify-center"
        >
          <div className="max-w-lg w-full px-6">
            <div className="space-y-2">
              {steps.slice(0, stepIndex + 1).map((step, i) => (
                <div key={i} className="h-5">
                  {i < stepIndex ? (
                    <span className="font-mono text-xs text-green-400/70">
                      [{">"} {step.text}]
                    </span>
                  ) : (
                    <AOSTerminalText
                      text={`[> ${step.text}]`}
                      speed={step.speed || 25}
                      className="text-xs text-green-400"
                      onComplete={advance}
                    />
                  )}
                </div>
              ))}
            </div>

            {stepIndex >= steps.length - 1 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="font-mono text-xs text-blue-400/60 mt-6 tracking-widest"
              >
                SYSTEM READY.
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
