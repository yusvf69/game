import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { useAOSStore } from "@/stores/aosStore";
import AOSLayout from "@/components/aos/AOSLayout";
import AOSBoot from "@/components/aos/AOSBoot";
import { useGetCurrentUser, useUpdateAvatar, getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

type UserProfile = { id: number; username: string; email: string | null; avatarUrl: string | null; isGuest: boolean; createdAt: string };

const AVATAR_PRESETS = [
  "https://api.dicebear.com/9.x/identicon/svg?seed=Alpha",
  "https://api.dicebear.com/9.x/identicon/svg?seed=Cipher",
  "https://api.dicebear.com/9.x/identicon/svg?seed=Ghost",
  "https://api.dicebear.com/9.x/identicon/svg?seed=Phantom",
  "https://api.dicebear.com/9.x/identicon/svg?seed=Shadow",
  "https://api.dicebear.com/9.x/identicon/svg?seed=Wraith",
];

const BOOT_STEPS = [
  { text: "INITIALIZING OPERATIVE CONFIGURATION...", delay: 400, speed: 25 },
  { text: "LOADING SETTINGS... OK", delay: 500, speed: 20 },
  { text: "ESTABLISHING SECURE CHANNEL...", delay: 600, speed: 20 },
  { text: "READY", delay: 800, speed: 15 },
];

export default function SettingsPage() {
  const [bootDone, setBootDone] = useState(false);
  const { booted, setBooted } = useAOSStore();

  const handleBootComplete = useCallback(() => {
    setBootDone(true);
    setBooted("settings");
  }, [setBooted]);

  useEffect(() => {
    if (booted["settings"]) setBootDone(true);
  }, [booted]);

  const qc = useQueryClient();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });
  const userProfile = user as UserProfile | undefined;
  const [saved, setSaved] = useState(false);

  const updateAvatarMutation = useUpdateAvatar({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    },
  });

  function selectAvatar(url: string) {
    updateAvatarMutation.mutate({ data: { avatarUrl: url } });
  }

  const section = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

  return (
    <>
      <AOSBoot steps={BOOT_STEPS} onComplete={handleBootComplete} pageKey="settings" alreadyBooted={bootDone} />
      <AOSLayout>
        <NavBar />
        <div className="pt-14 min-h-screen">

        <div className="relative max-w-2xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="font-mono text-xs text-zinc-600 tracking-widest mb-1">OPERATIVE</p>
            <h1 className="font-mono text-2xl font-bold text-zinc-100">SETTINGS</h1>
          </motion.div>

          <div className="space-y-6">
            {/* Agent Info */}
            <motion.div variants={section} initial="hidden" animate="show" className="glass-strong cipher-border rounded-lg p-6">
              <p className="font-mono text-xs text-zinc-500 tracking-widest mb-4">AGENT IDENTITY</p>

              <div className="space-y-4">
                <div>
                  <label className="font-mono text-xs text-zinc-600 tracking-widest block mb-2">OPERATIVE NAME</label>
                  <div className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded px-4 py-3 font-mono text-sm text-zinc-400">
                    {userProfile?.username || "Loading..."}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs text-zinc-600 tracking-widest block mb-2">SECURE CHANNEL</label>
                  <div className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded px-4 py-3 font-mono text-sm text-zinc-400">
                    {userProfile?.email || (userProfile?.isGuest ? "GHOST AGENT — NO EMAIL" : "—")}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs text-zinc-600 tracking-widest block mb-2">ACTIVE SINCE</label>
                  <div className="w-full bg-zinc-900/60 border border-zinc-700/40 rounded px-4 py-3 font-mono text-sm text-zinc-400">
                    {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Avatar Selection */}
            <motion.div
              variants={section}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.1 }}
              className="glass-strong cipher-border rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-xs text-zinc-500 tracking-widest">AGENT AVATAR</p>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-mono text-xs text-green-400"
                  >
                    SAVED
                  </motion.span>
                )}
              </div>

              {/* Current Avatar */}
              {userProfile?.avatarUrl && (
                <div className="flex items-center gap-4 mb-4 p-3 glass rounded-lg border border-blue-500/20">
                  <img src={userProfile.avatarUrl} alt="current avatar" className="w-12 h-12 rounded-full" />
                  <span className="font-mono text-xs text-zinc-500">CURRENT AVATAR</span>
                </div>
              )}

              <p className="font-mono text-xs text-zinc-600 mb-3">SELECT NEW AVATAR</p>
              <div className="grid grid-cols-6 gap-3">
                {AVATAR_PRESETS.map((url) => (
                  <motion.button
                    key={url}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectAvatar(url)}
                    className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      userProfile?.avatarUrl === url
                        ? "border-blue-500 ring-2 ring-blue-500/30"
                        : "border-zinc-700/40 hover:border-blue-500/40"
                    }`}
                    data-testid={`avatar-${AVATAR_PRESETS.indexOf(url)}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* System Info */}
            <motion.div
              variants={section}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.2 }}
              className="glass rounded-lg p-6 border border-zinc-800/30"
            >
              <p className="font-mono text-xs text-zinc-600 tracking-widest mb-4">SYSTEM INFORMATION</p>
              <div className="space-y-2">
                {[
                  ["SYSTEM", "CIPHER INTELLIGENCE v1.0"],
                  ["CLEARANCE", "OPERATIVE"],
                  ["DIVISION", "THE ARCHIVE"],
                  ["STATUS", "ACTIVE"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-1 border-b border-zinc-800/30 last:border-0">
                    <span className="font-mono text-xs text-zinc-600">{k}</span>
                    <span className="font-mono text-xs text-zinc-400">{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AOSLayout>
    </>
  );
}
