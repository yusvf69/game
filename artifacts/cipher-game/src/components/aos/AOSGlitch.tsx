import { useAOSStore } from "@/stores/aosStore";

export default function AOSGlitch() {
  const { glitchActive, glitchIntensity } = useAOSStore();

  if (!glitchActive) return null;

  return (
    <div
      className="fixed inset-0 z-[3] pointer-events-none mix-blend-screen"
      style={{
        animation: `glitch-overlay ${0.15 / glitchIntensity}s infinite`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(0,255,255,${0.03 * glitchIntensity})`,
          transform: `translate(${Math.random() * 4 - 2}px, 0)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `rgba(255,0,0,${0.02 * glitchIntensity})`,
          transform: `translate(${Math.random() * 4 - 2}px, 0)`,
        }}
      />
    </div>
  );
}
