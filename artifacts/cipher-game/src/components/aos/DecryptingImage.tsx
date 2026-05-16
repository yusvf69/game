import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  alt?: string;
  className?: string;
  decryptDuration?: number; // ms before fully clear
  startBlockSize?: number;  // starting pixelation block size
}

export default function DecryptingImage({
  src,
  alt = "",
  className = "",
  decryptDuration = 4000,
  startBlockSize = 32,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => {
      // Fallback: just show the raw image
      setReady(true);
    };
    img.src = src;
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [src]);

  useEffect(() => {
    if (!ready || !imgRef.current) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to container
    const maxW = 400;
    const maxH = 256;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    if (h > maxH) { w = (w * maxH) / h; h = maxH; }
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);

    startTimeRef.current = performance.now();

    function draw() {
      if (!canvas || !ctx || !img) return;
      const elapsed = performance.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / decryptDuration);

      // Ease out: fast start, slow finish
      const eased = 1 - Math.pow(1 - progress, 1.5);
      const blockSize = Math.max(1, Math.round(startBlockSize * (1 - eased)));

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (blockSize <= 1) {
        // Fully resolved
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        // Pixelated: draw the image scaled down then scaled back up
        const smallW = Math.max(1, Math.ceil(canvas.width / blockSize));
        const smallH = Math.max(1, Math.ceil(canvas.height / blockSize));

        // Use an offscreen canvas for the downscale
        const offscreen = document.createElement("canvas");
        offscreen.width = smallW;
        offscreen.height = smallH;
        const offCtx = offscreen.getContext("2d");
        if (offCtx) {
          offCtx.imageSmoothingEnabled = false;
          offCtx.drawImage(img, 0, 0, smallW, smallH);

          // Add random line corruption during decryption
          const corruptLines = Math.floor((1 - eased) * 4);
          for (let i = 0; i < corruptLines; i++) {
            const y = Math.floor(Math.random() * smallH);
            offCtx.fillStyle = Math.random() > 0.5
              ? `rgba(0, 255, 100, ${Math.random() * 0.3})`
              : `rgba(0, 0, 0, ${Math.random() * 0.5})`;
            offCtx.fillRect(0, y, smallW, 1);
          }

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        }
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ready, src, decryptDuration, startBlockSize]);

  // Fallback: if canvas fails, show img directly
  const [canvasFailed, setCanvasFailed] = useState(false);

  if (canvasFailed) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`rounded-lg border border-cyan-500/20 ${className}`}
        onError={() => setCanvasFailed(true)}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <span className="font-mono text-[10px] text-cyan-500/60 tracking-widest animate-pulse">
            DECRYPTING IMAGE...
          </span>
        </div>
      )}
      {/* Hidden img for fallback */}
      <img src={src} alt={alt} className="hidden" onError={() => setCanvasFailed(true)} />
    </div>
  );
}