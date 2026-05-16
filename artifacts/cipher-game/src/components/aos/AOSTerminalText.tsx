import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Props {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  glow?: boolean;
}

export default function AOSTerminalText({ text, speed = 30, className = "", onComplete, glow }: Props) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <motion.span
      className={`font-mono ${className} ${glow ? "neon-text-blue" : ""}`}
    >
      {displayed}
      {!done && (
        <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
      )}
    </motion.span>
  );
}
