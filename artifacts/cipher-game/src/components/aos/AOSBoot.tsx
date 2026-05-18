import { useEffect } from "react";

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

export default function AOSBoot({ onComplete }: Props) {
  useEffect(() => {
    onComplete();
  }, []);
  return null;
}
