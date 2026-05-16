import { useEffect, useRef, useState } from "react";

const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_position * 0.5 + 0.5;
  }
`;

function fragmentShader(pixelSize: number, scanlines: number): string {
  return `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform float u_progress;

    void main() {
      vec2 uv = v_texCoord;

      // Barrel distortion — fades with progress
      float dist = 1.0 - u_progress;
      float barrel = 1.0 + 0.15 * dist;
      vec2 center = uv - 0.5;
      float r2 = dot(center, center);
      vec2 distorted = uv + center * r2 * 0.3 * dist;
      if (distorted.x < 0.0 || distorted.x > 1.0 || distorted.y < 0.0 || distorted.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Pixelation — block size shrinks with progress
      float block = max(1.0, ${pixelSize} * (1.0 - u_progress * 0.95));
      vec2 pixelUv = floor(distorted * block) / block;

      // Sample the pixelated image
      vec4 color = texture2D(u_texture, pixelUv);

      // Apply scanline corruption during decryption
      float scanY = floor(gl_FragCoord.y / 2.0);
      float corruption = 0.0;
      if (u_progress < 0.3) {
        float randVal = fract(sin(scanY * 127.1 + gl_FragCoord.x * 311.7) * 43758.5453);
        corruption = step(0.92 - u_progress * 2.0, randVal) * 0.5;
      }

      // RGB shift on edges during decryption
      float shift = (1.0 - u_progress) * 0.008;
      float r = texture2D(u_texture, pixelUv + vec2(shift, 0.0)).r;
      float b = texture2D(u_texture, pixelUv - vec2(shift, 0.0)).b;
      vec3 shifted = vec3(r, color.g, b);

      // Scanlines overlay
      float scanline = 1.0 - 0.15 * step(0.5, fract(gl_FragCoord.y / 3.0));

      // Green tint during decryption (night vision / thermal feel)
      float tint = max(0.0, 1.0 - u_progress * 3.0) * 0.15;

      vec3 finalColor = mix(shifted, vec3(0.0, 1.0, 0.0), tint) * scanline;
      finalColor = finalColor + vec3(corruption, corruption * 0.3, corruption * 0.1);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
}

interface Props {
  src: string;
  alt?: string;
  className?: string;
  decryptDuration?: number;
  pixelSize?: number;
}

export default function WebGLDecrypt({
  src,
  alt = "",
  className = "",
  decryptDuration = 3500,
  pixelSize = 64,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const startTimeRef = useRef(0);
  const frameRef = useRef(0);
  const programRef = useRef<WebGLProgram | null>(null);
  const progressLocRef = useRef<WebGLUniformLocation | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setReady(true);
    };
    img.onerror = () => setFailed(true);
    img.src = src;
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [src]);

  useEffect(() => {
    if (!ready || !imgRef.current || failed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try WebGL2 first, fallback to WebGL1
    let gl: WebGLRenderingContext | null = canvas.getContext("webgl2") as unknown as WebGLRenderingContext;
    if (!gl) gl = canvas.getContext("webgl") as WebGLRenderingContext;
    if (!gl) { setFailed(true); return; }

    glRef.current = gl;

    const img = imgRef.current;
    const maxW = 420;
    const maxH = 280;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > maxW) { h = (h * maxW) / w; w = maxW; }
    if (h > maxH) { w = (w * maxH) / h; h = maxH; }
    canvas.width = Math.round(w);
    canvas.height = Math.round(h);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    if (!vs) { setFailed(true); return; }
    gl.shaderSource(vs, VERTEX_SHADER);
    gl.compileShader(vs);

    const fsCode = fragmentShader(pixelSize, 0);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fs) { setFailed(true); return; }
    gl.shaderSource(fs, fsCode);
    gl.compileShader(fs);

    // Check fs compile
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      setFailed(true);
      return;
    }

    const program = gl.createProgram();
    if (!program) { setFailed(true); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    progressLocRef.current = gl.getUniformLocation(program, "u_progress");

    // Geometry: full-screen quad
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Create texture
    const tex = gl.createTexture();
    textureRef.current = tex;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    startTimeRef.current = performance.now();

    function draw() {
      if (!gl || !program || !progressLocRef.current) return;
      const elapsed = performance.now() - startTimeRef.current;
      const progress = Math.min(1, elapsed / decryptDuration);
      const eased = 1 - Math.pow(1 - progress, 2);

      gl.uniform1f(progressLocRef.current, eased);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [ready, failed, src, decryptDuration, pixelSize]);

  if (failed) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className={`rounded-lg border border-cyan-500/20 ${className}`}
        style={{ width: "100%", height: "auto", maxWidth: "100%" }}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <span className="font-mono text-[10px] text-cyan-500/60 tracking-widest animate-pulse">
            DECRYPTING...
          </span>
        </div>
      )}
      <img src={src} alt={alt} className="hidden" onError={() => setFailed(true)} />
    </div>
  );
}