export default function AOSScanlines() {
  return (
    <div
      className="fixed inset-0 z-[2] pointer-events-none"
      style={{
        background: `linear-gradient(
          to bottom,
          rgba(255,255,255,0.015) 50%,
          rgba(0,0,0,0.04) 50%
        )`,
        backgroundSize: "100% 4px",
        animation: "scan 8s linear infinite",
      }}
    />
  );
}
