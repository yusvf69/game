import type { ReactNode } from "react";
import AOSBackground from "./AOSBackground";
import AOSScanlines from "./AOSScanlines";
import AOSGlitch from "./AOSGlitch";
import AOSPacketRain from "./AOSPacketRain";
import AOSHUD from "./AOSHUD";
import AOSAlert from "./AOSAlert";
import AOSAlertGenerator from "./AOSAlertGenerator";
import AOSDirectorMessage from "./AOSDirectorMessage";
import { useAOSAudio } from "@/hooks/useAOSAudio";
import { useAOSSocket } from "@/hooks/useAOSSocket";

interface Props {
  children: ReactNode;
  showHUD?: boolean;
  showPacketRain?: boolean;
}

export default function AOSLayout({ children, showHUD = true, showPacketRain = false }: Props) {
  useAOSAudio();
  useAOSSocket();
  return (
    <>
      <AOSBackground />
      <AOSScanlines />
      <AOSGlitch />
      {showPacketRain && <AOSPacketRain />}
      {showHUD && <AOSHUD />}
      <AOSAlert />
      <AOSAlertGenerator />
      <AOSDirectorMessage />
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </>
  );
}
