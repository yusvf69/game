import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export default function AOSBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafId = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize(c: HTMLCanvasElement) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize(canvas);
    const onResize = () => { resize(canvas); };
    window.addEventListener("resize", onResize);

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
    particles.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    function animate(ctxArg: CanvasRenderingContext2D, canvasArg: HTMLCanvasElement) {
      ctxArg.clearRect(0, 0, canvasArg.width, canvasArg.height);

      for (const p of particles.current) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvasArg.width;
        if (p.x > canvasArg.width) p.x = 0;
        if (p.y < 0) p.y = canvasArg.height;
        if (p.y > canvasArg.height) p.y = 0;

        ctxArg.beginPath();
        ctxArg.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctxArg.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctxArg.fill();
      }

      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const dx = particles.current[i].x - particles.current[j].x;
          const dy = particles.current[i].y - particles.current[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctxArg.beginPath();
            ctxArg.moveTo(particles.current[i].x, particles.current[i].y);
            ctxArg.lineTo(particles.current[j].x, particles.current[j].y);
            ctxArg.strokeStyle = `rgba(59, 130, 246, ${0.06 * (1 - dist / 120)})`;
            ctxArg.stroke();
          }
        }
      }

      rafId.current = requestAnimationFrame(() => animate(ctxArg, canvasArg));
    }
    animate(ctx, canvas);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-[#020408] via-[#050b1a] to-[#080516]" />
      <canvas ref={canvasRef} className="fixed inset-0 z-[1] pointer-events-none" />
      <motion.div
        className="fixed inset-0 z-[1] pointer-events-none"
        animate={{ opacity: [0.03, 0.06, 0.03] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle at 30% 50%, rgba(59,130,246,0.15) 0%, transparent 60%), radial-gradient(circle at 70% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)",
        }}
      />
    </>
  );
}
