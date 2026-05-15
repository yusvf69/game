import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLoginUser, useGuestLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"entry" | "login">("entry");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useLoginUser({
    mutation: {
      onSuccess(data) {
        setToken(data.token);
        setLocation("/dashboard");
      },
      onError() {
        setError("Invalid credentials. Try again.");
      },
    },
  });

  const guestMutation = useGuestLogin({
    mutation: {
      onSuccess(data) {
        setToken(data.token);
        setLocation("/dashboard");
      },
    },
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ data: { email, password } });
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* Deep space background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020408] via-[#050b1a] to-[#080516]" />
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute inset-0 scan-lines opacity-20" />

      {/* Animated glow orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)" }}
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <motion.h1
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="font-mono text-7xl font-black tracking-[0.3em] neon-text-blue text-blue-400 mb-2"
          >
            CIPHER
          </motion.h1>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-500/40" />
            <span className="font-mono text-xs tracking-[0.4em] text-zinc-500">INTELLIGENCE DIVISION</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-500/40" />
          </div>
          <p className="font-mono text-xs text-zinc-600 tracking-wider">
            THE ARCHIVE — CLEARANCE REQUIRED
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === "entry" ? (
            <motion.div
              key="entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-4"
            >
              <div className="glass-strong rounded-lg p-6 mb-6 cipher-border">
                <p className="font-mono text-xs text-zinc-400 leading-relaxed tracking-wide">
                  THE ARCHIVE has detected your presence. You have been selected for
                  intelligence operations. Your performance will shape the future of
                  this organization.
                </p>
              </div>

              <button
                onClick={() => setMode("login")}
                className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 glass cipher-border rounded-lg hover:bg-blue-500/10 transition-all duration-300 neon-blue"
                data-testid="enter-btn"
              >
                AUTHENTICATE — AGENT LOGIN
              </button>

              <button
                onClick={() => guestMutation.mutate(undefined)}
                disabled={guestMutation.isPending}
                className="w-full py-4 font-mono text-sm tracking-widest text-zinc-400 glass rounded-lg hover:bg-zinc-500/10 transition-all duration-300 border border-zinc-700/50"
                data-testid="guest-btn"
              >
                {guestMutation.isPending ? "CONNECTING..." : "ENTER AS GHOST AGENT"}
              </button>

              <button
                onClick={() => setLocation("/register")}
                className="w-full py-3 font-mono text-xs tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                REGISTER NEW IDENTITY
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <form onSubmit={handleLogin} className="glass-strong rounded-lg p-8 cipher-border space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => { setMode("entry"); setError(""); }}
                    className="text-zinc-600 hover:text-zinc-300 font-mono text-xs tracking-wider"
                  >
                    BACK
                  </button>
                  <div className="h-px flex-1 bg-blue-500/20" />
                  <span className="font-mono text-xs text-zinc-500 tracking-widest">AUTHENTICATION</span>
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
                  <label className="font-mono text-xs tracking-widest text-zinc-500 block mb-2">EMAIL</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-zinc-900/60 border border-blue-500/20 rounded px-4 py-3 font-mono text-sm text-zinc-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    placeholder="agent@archive.gov"
                    data-testid="email-input"
                  />
                </div>

                <div>
                  <label className="font-mono text-xs tracking-widest text-zinc-500 block mb-2">PASSPHRASE</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-zinc-900/60 border border-blue-500/20 rounded px-4 py-3 font-mono text-sm text-zinc-200 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    placeholder="••••••••"
                    data-testid="password-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full py-4 font-mono text-sm tracking-widest text-blue-300 bg-blue-600/20 border border-blue-500/40 rounded-lg hover:bg-blue-600/30 transition-all duration-300 neon-blue disabled:opacity-50"
                  data-testid="login-submit-btn"
                >
                  {loginMutation.isPending ? "AUTHENTICATING..." : "CONFIRM IDENTITY"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <p className="font-mono text-[10px] tracking-widest text-zinc-700">
            ALL OPERATIONS MONITORED — THE ARCHIVE
          </p>
        </motion.div>
      </div>
    </div>
  );
}
