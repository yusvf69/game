import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useRegisterUser } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";

const BOOT_STEPS = [
  { text: "INITIALIZING NEW OPERATIVE REGISTRATION...", delay: 400, speed: 25 },
  { text: "ESTABLISHING SECURE CHANNEL... OK", delay: 500, speed: 20 },
  { text: "ENCRYPTING IDENTITY...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function RegisterPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("register");
  }, [setBooted]);

  useEffect(() => {
    if (booted["register"]) setBootDone(true);
  }, [booted]);

  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const registerMutation = useRegisterUser({
    mutation: {
      onSuccess(data) {
        setToken(data.token);
        setLocation("/dashboard");
      },
      onError(err: unknown) {
        const e = err as { data?: { error?: string } };
        setError(e?.data?.error || "Registration failed. Try again.");
      },
    },
  });

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    registerMutation.mutate({ data: { username, email, password } });
  }

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="register" alreadyBooted={bootDone} />
      <AOSLayout showHUD={false}>
        <div className="min-h-screen w-full flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 9, repeat: Infinity }}
            className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)" }}
          />

          <div className="w-full max-w-md mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="font-mono text-5xl font-black tracking-[0.3em] neon-text-blue text-blue-400 mb-2">CIPHER</h1>
          <p className="font-mono text-xs text-zinc-600 tracking-[0.3em]">REGISTER NEW OPERATIVE</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={handleRegister}
          className="glass-strong rounded-lg p-8 cipher-border space-y-5"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-purple-500/20" />
            <span className="font-mono text-xs text-zinc-500 tracking-widest">NEW IDENTITY</span>
            <div className="h-px flex-1 bg-purple-500/20" />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 font-mono text-xs tracking-wider bg-red-500/10 border border-red-500/30 rounded px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="font-mono text-xs tracking-widest text-zinc-500 block mb-2">OPERATIVE NAME</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              className="w-full bg-zinc-900/60 border border-purple-500/20 rounded px-4 py-3 font-mono text-sm text-zinc-200 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="Agent Designation"
              data-testid="username-input"
            />
          </div>

          <div>
            <label className="font-mono text-xs tracking-widest text-zinc-500 block mb-2">SECURE CHANNEL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-zinc-900/60 border border-purple-500/20 rounded px-4 py-3 font-mono text-sm text-zinc-200 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="operative@archive.gov"
              data-testid="reg-email-input"
            />
          </div>

          <div>
            <label className="font-mono text-xs tracking-widest text-zinc-500 block mb-2">PASSPHRASE</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-zinc-900/60 border border-purple-500/20 rounded px-4 py-3 font-mono text-sm text-zinc-200 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="Minimum 6 characters"
              data-testid="reg-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full py-4 font-mono text-sm tracking-widest text-purple-300 bg-purple-600/20 border border-purple-500/40 rounded-lg hover:bg-purple-600/30 transition-all duration-300 hologram-btn disabled:opacity-50"
            data-testid="register-submit-btn"
          >
            {registerMutation.isPending ? "ESTABLISHING IDENTITY..." : "CREATE OPERATIVE FILE"}
          </button>

          <button
            type="button"
            onClick={() => setLocation("/")}
            className="w-full py-2 font-mono text-xs tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            RETURN TO ENTRY POINT
          </button>
        </motion.form>
      </div>
    </div>
    </AOSLayout>
    </>
  );
}
