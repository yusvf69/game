import { useEffect, useRef } from "react";

const CHARS = "0123456789ABCDEF";
const PACKET_TYPES = ["ENCRYPTED", "ROUTED", "DECODED", "INTERCEPTED", "QUEUED", "FORWARDED"];

function randomPacket(): string {
  const type = PACKET_TYPES[Math.floor(Math.random() * PACKET_TYPES.length)];
  const id = Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  const data = Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
  return `PKT-${id} // ${type} // ${data}`;
}

interface Packet {
  text: string;
  x: number;
  y: number;
  speed: number;
  opacity: number;
  size: number;
}

export default function AOSPacketRain() {
  const containerRef = useRef<HTMLDivElement>(null);
  const packets = useRef<Packet[]>([]);
  const rafId = useRef(0);

  useEffect(() => {
    const w = window.innerWidth;
    const count = Math.min(8, Math.floor(w / 200));

    packets.current = Array.from({ length: count }, () => {
      const startY = Math.random() * window.innerHeight;
      const startX = Math.random() * window.innerWidth;
      return {
        text: randomPacket(),
        x: startX,
        y: startY,
        speed: 0.2 + Math.random() * 0.4,
        opacity: 0.1 + Math.random() * 0.15,
        size: 9 + Math.random() * 3,
      };
    });

    function animate() {
      const el = containerRef.current;
      if (!el) return;

      for (const p of packets.current) {
        p.y -= p.speed;
        if (p.y < -30) {
          p.y = window.innerHeight + 10;
          p.x = Math.random() * window.innerWidth;
          p.text = randomPacket();
        }
      }

      el.innerHTML = packets.current
        .map(
          (p) =>
            `<div style="position:absolute;left:${p.x}px;top:${p.y}px;opacity:${p.opacity};font-size:${p.size}px;font-family:monospace;color:rgba(59,130,246,0.3);white-space:nowrap;pointer-events:none;transition:none">${p.text}</div>`,
        )
        .join("");

      rafId.current = requestAnimationFrame(animate);
    }
    animate();

    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return <div ref={containerRef} className="fixed inset-0 z-[1] pointer-events-none overflow-hidden" />;
}
